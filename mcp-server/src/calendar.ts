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

  // If exact times are provided, use dateTime. Otherwise, default to an all-day event today.
  if (startTime && endTime) {
    event.start = { dateTime: startTime, timeZone };
    event.end = { dateTime: endTime, timeZone };
  } else {
    const today = new Date().toISOString().split('T')[0];
    event.start = { date: today };
    event.end = { date: today };
  }

  // Inject our native hidden metadata using extendedProperties.private
  if (aiMetadata) {
    event.extendedProperties = {
      private: aiMetadata as Record<string, string>
    };
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
  
  // 1. Fetch existing event first to avoid clobbering
  const existing = await calendar.events.get({ calendarId, eventId });
  const event = existing.data;

  // 2. Apply updates
  if (updates.title) event.summary = updates.title;
  if (updates.description !== undefined) event.description = updates.description;
  
  if (updates.startTime && updates.endTime) {
    event.start = { dateTime: updates.startTime, timeZone: updates.timeZone };
    event.end = { dateTime: updates.endTime, timeZone: updates.timeZone };
  }

  // 3. Merge AI Metadata safely
  if (updates.aiMetadata) {
    event.extendedProperties = event.extendedProperties || {};
    event.extendedProperties.private = {
      ...event.extendedProperties.private,
      ...(updates.aiMetadata as Record<string, string>)
    };
  }

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
