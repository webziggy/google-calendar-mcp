import { calendar_v3 } from 'googleapis';
export interface AIMetadata {
    conversation_id?: string;
    managed_by_ai?: string;
    [key: string]: string | undefined;
}
/**
 * Lists all calendars the user has access to.
 */
export declare function listCalendars(): Promise<calendar_v3.Schema$CalendarListEntry[]>;
/**
 * Creates a new, dedicated calendar.
 */
export declare function createCalendar(summary: string, description?: string): Promise<any>;
/**
 * Lists events for a specific calendar within an optional time range.
 */
export declare function listEvents(calendarId: string, timeMin?: string, timeMax?: string): Promise<any>;
/**
 * Creates a new event with native support for exact times and hidden AI metadata.
 */
export declare function createEvent(calendarId: string, title: string, description?: string, startTime?: string, endTime?: string, timeZone?: string, aiMetadata?: AIMetadata): Promise<calendar_v3.Schema$Event>;
/**
 * Updates an existing event. Uses read-modify-write to ensure we don't clobber existing data.
 */
export declare function updateEvent(calendarId: string, eventId: string, updates: {
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    timeZone?: string;
    aiMetadata?: AIMetadata;
}): Promise<calendar_v3.Schema$Event>;
/**
 * Deletes an event from the calendar.
 */
export declare function deleteEvent(calendarId: string, eventId: string): Promise<boolean>;
//# sourceMappingURL=calendar.d.ts.map