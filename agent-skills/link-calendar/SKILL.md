---
name: link-calendar
description: Interactively links a specific Google Calendar to the current project, with safety guardrails to protect core personal calendars.
---

# Link Calendar Skill

Use this skill when configuring an AI agent in a new workspace that requires scheduling capabilities via the Google Calendar MCP Server.

## Workflow

1. **Fetch Options**: Execute the `list_calendars` MCP tool to retrieve the user's available calendars.
2. **Present Options**: Display the list to the user. Ask them to select an existing calendar or request to create a new, dedicated one (e.g., "Project Reminders").
3. **Safety Guardrails**: 
   - If the user selects a sensitive personal calendar (e.g., `primary`, `Home`, `Family`, `Birthdays`, `Tasks`), you MUST issue a clear warning: *"WARNING: You have selected a core personal calendar. Are you sure you want AI-generated events to be placed here?"*
   - Wait for explicit user confirmation before proceeding.
4. **Creation (If requested)**: If the user wants a new calendar, use the `create_calendar` MCP tool and retrieve the newly generated `id`.
5. **Save Configuration**: Write a project-specific rule file at `.agents/rules/calendar.md` with the following content:
   ```markdown
   # Google Calendar Configuration
   - **Target Calendar ID:** `<the-selected-calendar-id>`
   - **Rule:** When creating, listing, or updating events via the MCP server, ALWAYS pass this specific `calendarId`. Never default to `primary`.
   ```
6. **Finish**: Confirm to the user that the calendar is linked and the workspace is ready for safe scheduling!
