---
name: daily-briefing
description: Generates a morning briefing of the user's schedule, highlighting heavy meeting loads and proposing time blocks.
---

# Daily Briefing

Run this skill when a user asks for a morning brief, schedule overview, or agenda.

## Workflow
1. **Read Preferences:** Check if `calendar_preferences.md` exists to understand the user's working hours and calendar categories (Work vs Personal). If it doesn't exist, recommend they run the `calendar-setup` skill first.
2. **Fetch Events:** Call `list_events` for the current day across the relevant primary calendars.
3. **Analyze Load:** 
   - Compare the total meeting duration against the user's defined working hours.
   - If their schedule is highly congested (e.g., >75% of their working hours are booked), explicitly flag this.
   - Proactively suggest calling `create_event` to block out the remaining free time as "Focus Time" or "Do Not Book" to protect their sanity.
4. **Deliver Briefing:** Present a concise, easy-to-read agenda for the day, summarizing who they are meeting with (parsing the `attendees` array) and any missing breaks (e.g., "You have back-to-back meetings from 11 AM to 3 PM with no lunch break scheduled").
