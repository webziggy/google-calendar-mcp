"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCalendars = listCalendars;
exports.createCalendar = createCalendar;
exports.listEvents = listEvents;
exports.createEvent = createEvent;
exports.updateEvent = updateEvent;
exports.deleteEvent = deleteEvent;
const auth_js_1 = require("./auth.js");
const googleapis_1 = require("googleapis");
/**
 * Lists all calendars the user has access to.
 */
async function listCalendars() {
    const calendar = (0, auth_js_1.getCalendarClient)();
    const res = await calendar.calendarList.list();
    return res.data.items || [];
}
/**
 * Creates a new, dedicated calendar.
 */
async function createCalendar(summary, description) {
    const calendar = (0, auth_js_1.getCalendarClient)();
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
async function listEvents(calendarId, timeMin, timeMax) {
    const calendar = (0, auth_js_1.getCalendarClient)();
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
async function createEvent(calendarId, title, description, startTime, endTime, timeZone, aiMetadata) {
    const calendar = (0, auth_js_1.getCalendarClient)();
    const event = {
        summary: title,
        description: description,
    };
    // If exact times are provided, use dateTime. Otherwise, default to an all-day event today.
    if (startTime && endTime) {
        event.start = { dateTime: startTime, timeZone };
        event.end = { dateTime: endTime, timeZone };
    }
    else {
        const today = new Date().toISOString().split('T')[0];
        event.start = { date: today };
        event.end = { date: today };
    }
    // Inject our native hidden metadata using extendedProperties.private
    if (aiMetadata) {
        event.extendedProperties = {
            private: aiMetadata
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
async function updateEvent(calendarId, eventId, updates) {
    const calendar = (0, auth_js_1.getCalendarClient)();
    // 1. Fetch existing event first to avoid clobbering
    const existing = await calendar.events.get({ calendarId, eventId });
    const event = existing.data;
    // 2. Apply updates
    if (updates.title)
        event.summary = updates.title;
    if (updates.description !== undefined)
        event.description = updates.description;
    if (updates.startTime && updates.endTime) {
        event.start = { dateTime: updates.startTime, timeZone: updates.timeZone };
        event.end = { dateTime: updates.endTime, timeZone: updates.timeZone };
    }
    // 3. Merge AI Metadata safely
    if (updates.aiMetadata) {
        event.extendedProperties = event.extendedProperties || {};
        event.extendedProperties.private = {
            ...event.extendedProperties.private,
            ...updates.aiMetadata
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
async function deleteEvent(calendarId, eventId) {
    const calendar = (0, auth_js_1.getCalendarClient)();
    await calendar.events.delete({
        calendarId,
        eventId,
    });
    return true;
}
//# sourceMappingURL=calendar.js.map