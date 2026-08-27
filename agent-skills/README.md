# Agent Skills

This folder contains pre-written AI Skills designed to work alongside the Google Calendar MCP server. 

## How to use these skills in your own projects
When you are working in a totally different project (e.g., a codebase called `job-reviewer`), you can give your AI agent access to these scheduling workflows by copying the skills into that project's `.agents` folder.

1. In your target project, create an `.agents/skills/` directory.
2. Copy the `link-calendar/` folder from here into that directory.
3. Your AI agent will now automatically know how to safely link a calendar to your project!

## Available Skills

### 1. `link-calendar`
Enforces safety constraints to ensure agents don't blindly schedule events on your main personal calendars ("Home", "Birthdays") without explicit double confirmation.

### 2. `calendar-assistant`
Teaches your AI how to handle natural language scheduling queries. Includes workflows for finding free time ("When am I free?"), locating people/invitees in the attendees array, finding Teams/Zoom links, and modifying existing events.
