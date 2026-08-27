import { getCalendarClient } from './auth.js';
import { calendar_v3 } from 'googleapis';

export interface AIMetadata {
  conversation_id?: string;
  managed_by_ai?: string;
  [key: string]: string | undefined;
}

/**
 * Lists all calendars the user has access to.
 */
export async function listCalendars() {
  const calendar = getCalendarClient();
  const res = await calendar.calendarList.list();
  return res.data.items || [];
}

/**
 * Creates a new, dedicated calendar and injects a warning event.
 */
export async function createCalendar(summary: string, description?: string) {
  const calendar = getCalendarClient();
  const res = await calendar.calendars.insert({
    requestBody: {
      summary,
      description,
    },
  });
  
  const newCalendarId = res.data.id;
  if (newCalendarId) {
    // Create an all-day warning event that repeats yearly
    const today = new Date().toISOString().split('T')[0];
    await calendar.events.insert({
      calendarId: newCalendarId,
      requestBody: {
        summary: '⚠️ AI Managed Calendar - Edit with Caution',
        description: 'This calendar is managed by an AI agent via Model Context Protocol. Manual edits to events may disrupt the agent\'s tracking.',
        start: { date: today },
        end: { date: today },
        recurrence: ['RRULE:FREQ=YEARLY']
      }
    });
  }
  
  return res.data;
}

/**
 * Retrieves the timezone for a given calendar to use as a fallback.
 */
async function getCalendarTimezone(calendarId: string): Promise<string> {
  const calendar = getCalendarClient();
  const res = await calendar.calendars.get({ calendarId });
  return res.data.timeZone || 'UTC';
}

/**
 * Lists events for a specific calendar.
 * Exposes pageToken so the calling AI can paginate manually, preventing tool timeouts
 * and allowing the user to see progress via multiple tool calls in the chat.
 */
export async function listEvents(
  calendarId: string, 
  timeMin?: string, 
  timeMax?: string, 
  pageToken?: string,
  maxResults: number = 100
) {
  const calendar = getCalendarClient();
  
  const res = await calendar.events.list({
    calendarId,
    // If timeMin is omitted, don't default to now (allows fetching past events).
    timeMin: timeMin,
    timeMax: timeMax,
    maxResults,
    singleEvents: true, // Expands recurring events into single instances
    orderBy: 'startTime',
    pageToken: pageToken
  });

  return {
    events: res.data.items || [],
    nextPageToken: res.data.nextPageToken
  };
}

const SCHEMA_VERSION = "0.1.0";

/**
 * Validates metadata against Google Calendar's strict API limits.
 */
function validateMetadataLimits(metadata: Record<string, string>) {
  const keys = Object.keys(metadata);
  if (keys.length > 300) {
    throw new Error(`Metadata exceeds Google Calendar's limit of 300 keys per event (currently at ${keys.length}).`);
  }

  for (const [key, value] of Object.entries(metadata)) {
    if (key.length > 44) {
      throw new Error(`Metadata key '${key}' exceeds Google Calendar's 44-character limit.`);
    }
    if (value && value.length > 1024) {
      throw new Error(`Metadata value for '${key}' exceeds Google Calendar's 1024-character limit. Compress your JSON payload.`);
    }
}

  }

/**
 * Creates a new event with native support for exact times and hidden AI metadata.
 */
export async function createEvent(
  calendarId: string,
  title: string,
  description?: string,
  startTime?: string,
  endTime?: string,
  timeZone?: string,
  aiMetadata?: AIMetadata
) {
  const calendar = getCalendarClient();
  
  const event: calendar_v3.Schema$Event = {
    summary: title,
    description: description,
  };

  if (startTime && endTime) {
    const tz = timeZone || await getCalendarTimezone(calendarId);
    event.start = { dateTime: startTime, timeZone: tz };
    event.end = { dateTime: endTime, timeZone: tz };
  } else {
    const today = new Date().toISOString().split('T')[0];
    event.start = { date: today };
    event.end = { date: today };
  }

  // Inject our native hidden metadata using extendedProperties.private
  // and automatically append the schema version for forward compatibility.
  const baseMetadata = (aiMetadata || {}) as Record<string, string>;
  event.extendedProperties = {
    private: {
      ...baseMetadata,
      _schema_version: SCHEMA_VERSION
    }
  };
  if (event.extendedProperties.private) {
    validateMetadataLimits(event.extendedProperties.private as Record<string, string>);
  }

  const res = await calendar.events.insert({
    calendarId,
    requestBody: event,
  });

  return res.data;
}

/**
 * Updates an existing event. Uses read-modify-write to ensure we don't clobber existing data.
 */
export async function updateEvent(
  calendarId: string,
  eventId: string,
  updates: {
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    timeZone?: string;
    aiMetadata?: AIMetadata;
  }
) {
  const calendar = getCalendarClient();
  
  const existing = await calendar.events.get({ calendarId, eventId });
  const event = existing.data;

  if (updates.title) event.summary = updates.title;
  if (updates.description !== undefined) event.description = updates.description;
  
  if (updates.startTime && updates.endTime) {
    const tz = updates.timeZone || event.start?.timeZone || await getCalendarTimezone(calendarId);
    event.start = { dateTime: updates.startTime, timeZone: tz };
    event.end = { dateTime: updates.endTime, timeZone: tz };
  }

  // Merge AI Metadata safely and re-stamp the schema version
  const mergedMetadata = {
    ...(event.extendedProperties?.private || {}),
    ...(updates.aiMetadata as Record<string, string> || {}),
    _schema_version: SCHEMA_VERSION
  };

  event.extendedProperties = event.extendedProperties || {};
  event.extendedProperties.private = mergedMetadata;

  validateMetadataLimits(event.extendedProperties.private as Record<string, string>);

  const res = await calendar.events.update({
    calendarId,
    eventId,
    requestBody: event,
  });

  return res.data;
}

/**
 * Safely appends a formatted, timestamped log entry to an event's visible description.
 */
export async function appendEventLog(calendarId: string, eventId: string, message: string, author: string = "AI") {
  const calendar = getCalendarClient();
  
  const existing = await calendar.events.get({ calendarId, eventId });
  const event = existing.data;

  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 16) + ' GMT'; // e.g. 2026-08-27 15:10 GMT
  
  const logEntry = `\n\n---\n[${timestamp}][${author}] ${message}`;
  
  event.description = (event.description || '').trim() + logEntry;

  const res = await calendar.events.update({
    calendarId,
    eventId,
    requestBody: event,
  });

  return res.data;
}

/**
 * Deletes an event from the calendar.
 */
export async function deleteEvent(calendarId: string, eventId: string) {
  const calendar = getCalendarClient();
  await calendar.events.delete({
    calendarId,
    eventId,
  });
  return true;
}
