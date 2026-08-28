# Calendar Preferences (Example)

This file (`mcp-server/calendar_preferences.md`) acts as the global state engine for your AI agents and the Companion App. It defines your working hours and instructs the AI on how to interact with your specific calendars.

You can generate this file using the `calendar-setup` agent skill, or create it manually.

## Routine
- **Timezone:** Europe/London
- **Work Days:** Monday, Tuesday, Wednesday, Thursday, Friday
- **Work Hours:** 09:00 - 17:00
- **Protected Breaks:** 12:00 - 13:00
- **Focus/Break Calendar:** personal@example.com (Home)

## Calendars

* **Category:** (`Personal`, `Work`, `AI-Managed`, `Shared`, `Other`). Purely defines the origin or primary purpose of the calendar.
* **Role:** (`owner`, `writer`, `reader`). Defines the API mutation rights. If `reader`, the AI will refuse to try and modify events on it.
* **Status:** (`Active`, `Ignored`). Used to determine if the AI and the Companion App should actively sync, monitor, or pull events from it.

| ID | Name | Category | Role | Status |
|---|---|---|---|---|
| personal@example.com | Home | Personal | owner | Active |
| work@company.com | Work Calendar | Work | reader | Active |
| 1234567890@group.calendar.google.com | AI Workflows | AI-Managed | owner | Active |
| family123@group.calendar.google.com | Family | Shared | reader | Active |
| * | All other Holiday / App calendars | Other | reader | Ignored |
