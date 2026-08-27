---
name: calendar-setup
description: An onboarding workflow to categorize calendars, define working hours, and save user preferences.
---

# Calendar Setup & Onboarding

Run this skill when a user asks to set up, configure, or calibrate their calendar preferences, OR when a new, uncategorized calendar is detected.

## 1. The Interview Workflow
1. **Fetch Calendars:** Call `list_calendars` to get all available calendars.
   - Note the `accessRole` (owner, writer, reader) returned by the API for each calendar. You will need this for the preferences table.

2. **Categorization:** Ask the user to categorize each calendar (Work, Personal, Read-Only, Ignore, AI-Managed). *If this is a partial setup for a newly discovered calendar, only ask about the new one.*
3. **Working Hours:** Ask the user to define their working routine (Start/End times, Timezone, Work Days, Protected Breaks like lunch).

## 2. Configuration Schema
You must save the output exactly in this format using `write_to_file` to `calendar_preferences.md` in the current workspace. This file is designed to be easily machine-readable by you, and easily hand-editable by the user.

```markdown
# Calendar Preferences

## Routine
- **Timezone:** Europe/London
- **Work Days:** Monday, Tuesday, Wednesday, Thursday, Friday
- **Work Hours:** 09:00 - 17:30
- **Protected Breaks:** 12:30 - 13:30 (Lunch)
- **Focus/Break Calendar:** primary (Home)

- **Focus/Break Calendar:** Which specific calendar should be used to schedule your lunch breaks and focus time? (Not all calendars need this; usually, it's your Primary or Work calendar).


## Calendars
| ID | Name | Category | Role |
|---|---|---|---|
| primary | Home | Personal | owner |
| 12345@group.calendar.google.com | Work Meetings | Work | reader |
| 67890@group.calendar.google.com | UK Holidays | Read-Only | reader |
| 09876@group.calendar.google.com | Spam Calendar | Ignore | owner |
```

## 3. Manual Editing
Always inform the user that `calendar_preferences.md` is a living document. They can open the file in their editor and change their hours or categories at any time, and you will natively adapt to the new settings on your next run.
