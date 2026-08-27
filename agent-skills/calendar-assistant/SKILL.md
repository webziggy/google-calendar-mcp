---
name: calendar-assistant
description: Natural language workflows for querying, scheduling, and modifying Google Calendar events seamlessly.
---

# Calendar Assistant

This skill teaches the agent how to natively handle common natural language requests ("What's my next meeting?", "Do I have a sync with Bob?", "Where is the Teams link?") using the local Google Calendar MCP Server.

## 1. Core Guidelines
- **Default Calendar Routing:** If the user asks a general scheduling question without explicitly naming a calendar, you should prioritize searching for a calendar named **"Home"**. If no "Home" calendar exists in `list_calendars`, fall back to the primary calendar.
- **Time Constraints (RFC3339):** The Google API requires strict RFC3339 bounds. When the user says "today", you must calculate `timeMin` as the current local time, and `timeMax` as 23:59:59 local time.
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
