---
name: calendar-setup
description: An onboarding workflow to categorize calendars, define working hours, and save user preferences.
---

# Calendar Setup & Onboarding

Run this skill when a user asks to set up, configure, or calibrate their calendar preferences.

## Workflow
1. **Fetch Calendars:** Call `list_calendars` to get all calendars available to the MCP server.
2. **The Interview:** Engage the user in an interactive chat. Present their calendars and ask:
   - Which ones are for **Work**?
   - Which ones are for **Personal**?
   - Which ones are **Read-Only / Holidays**?
   - Which ones should be completely **Ignored**?
3. **Working Hours:** Ask the user to define their working routine. 
   - *Never assume 9-5.* Ask when their day starts/ends, which days they work, and what timezone they consider their "base".
   - Ask if they have protected break preferences (e.g., "Always block 1 hour for lunch between 12-2 PM").
4. **Save Configuration:** Compile all of these preferences into a well-formatted markdown file and use `write_to_file` to save it to `calendar_preferences.md` in the current workspace.

Other skills (like `calendar-assistant` and `daily-briefing`) will natively read this file to inform their logic.
