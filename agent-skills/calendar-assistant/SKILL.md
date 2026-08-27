---
name: calendar-assistant
description: Natural language workflows for querying, scheduling, and modifying Google Calendar events seamlessly.
---

# Calendar Assistant

This skill teaches the agent how to natively handle common natural language requests ("What's my next meeting?", "Do I have a sync with Bob?", "Where is the Teams link?") using the local Google Calendar MCP Server.

## 1. Core Guidelines
- **Preferences Sync (Create/Delete):** If you use the `create_calendar` or `delete_calendar` tools, you MUST immediately update the local `calendar_preferences.md` file to reflect the change. (If creating, assign it a logical category based on context).
- **Drift Detection (Unknown Calendars):** Whenever you call `list_calendars`, cross-reference the output with the `calendar_preferences.md` file. If you detect a calendar that is missing from the file (likely created outside the MCP), you must pause your current workflow and initiate a brief "partial calendar setup" to ask the user how to categorize the new calendar before proceeding.

- **Never Schedule Blindly (Conflict Resolution):** Before calling `create_event` or `update_event`, ALWAYS call `list_events` for that timeframe. If there is a conflict, do not schedule. Calculate the next available 30-minute block and propose it to the user.
- **Timezone Confirmation:** If you haven't scheduled anything recently, explicitly state the timezone you *assume* the user is in (e.g., "I'll schedule this in BST...") to give them a chance to correct you. Always perform strict timezone math if they request a foreign timezone.
- **Recurring Event Instance Safety:** When modifying or deleting an event, ensure you are interacting with the specific *instance ID* (which `list_events` provides when `singleEvents: true` is set), not the parent series ID, unless explicitly asked to modify the entire series.
- **Preferences Awareness:** Before scheduling, check if a `calendar_preferences.md` file exists. If it does, respect the defined working hours, break times, and calendar categories.

- **Default Calendar Routing:** If the user asks a general scheduling question without explicitly naming a calendar, you should prioritize searching for a calendar named **"Home"**. If no "Home" calendar exists in `list_calendars`, fall back to the primary calendar.
- **Time Constraints (RFC3339):** The Google API requires strict RFC3339 bounds. When the user says "today", you must calculate `timeMin` as the current local time, and `timeMax` as 23:59:59 local time.
- **Multi-Calendar Aggregation:** The underlying MCP server only accepts one `calendarId` per request. If a user asks to check their free time or search for an event without specifying a single calendar, you should ask if they want you to check across all their primary calendars (e.g., Home, Work, Family). To check multiple calendars, execute `list_events` concurrently for each calendar and aggregate the results locally in your context.

- **Invitees vs Attendees:** The Google Calendar API does not have a separate `invitees` field. Everyone is grouped inside the `attendees` array. You can determine their RSVP status by checking `attendees[].responseStatus` (e.g., `needsAction`, `accepted`, `declined`).

## 2. Standard Workflows

### Finding People & Meetings
When asked "Do I have a meeting with Joe Bloggs tomorrow?":
1. Calculate the strict `timeMin` and `timeMax` for tomorrow.
2. Call `list_events`.
3. Iterate through the returned events, scanning the `summary`, `description`, and the `attendees[].displayName` / `attendees[].email` fields for the person's name.

### Locating Video Conference Links
When asked "What's the link for my meeting now?":
1. Fetch the upcoming/current event.
2. Search for conference URLs in this exact order:
   - Inside the `conferenceData` object.
   - Inside the `location` string.
   - Using regex or substring matching inside the `description`.

### Identifying Free Time
When asked "When am I free this afternoon?":
1. Fetch all events for the requested block (e.g. 12:00 to 17:00).
2. Plot the occupied `start` and `end` times.
3. Invert the map to identify gaps of at least 30 minutes, and summarize the available blocks for the user.

### Moving/Pushing Events
When asked "Push my 2 PM meeting back by 30 minutes":
1. Call `list_events` around 2 PM to locate the specific event and obtain its `id` and original duration.
2. Calculate the new `start` and `end` RFC3339 timestamps.
3. Call `update_event` passing the new `startTime` and `endTime`.
