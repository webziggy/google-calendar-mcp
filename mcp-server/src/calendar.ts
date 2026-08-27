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
 * Creates a new, dedicated calendar.
 */
export async function createCalendar(summary: string, description?: string) {
  const calendar = getCalendarClient();
  const res = await calendar.calendars.insert({
    requestBody: {
      summary,
      description,
    },
  });
  return res.data;
}

/**
 * Lists events for a specific calendar within an optional time range.
 */
export async function listEvents(calendarId: string, timeMin?: string, timeMax?: string) {
  const calendar = getCalendarClient();
  const res = await calendar.events.list({
    calendarId,
    timeMin: timeMin || (new Date()).toISOString(),
    timeMax,
    maxResults: 100,
    singleEvents: true, // Expands recurring events into single instances
    orderBy: 'startTime',
  });
  return res.data.items || [];
}

const SCHEMA_VERSION = "0.1-draft";

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
    event.start = { dateTime: startTime, timeZone };
    event.end = { dateTime: endTime, timeZone };
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
    event.start = { dateTime: updates.startTime, timeZone: updates.timeZone };
    event.end = { dateTime: updates.endTime, timeZone: updates.timeZone };
  }

  // Merge AI Metadata safely and re-stamp the schema version
  const mergedMetadata = {
    ...(event.extendedProperties?.private || {}),
    ...(updates.aiMetadata as Record<string, string> || {}),
    _schema_version: SCHEMA_VERSION
  };

  event.extendedProperties = event.extendedProperties || {};
  event.extendedProperties.private = mergedMetadata;

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
