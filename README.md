# Google Calendar MCP Server (AI Reminders)

A privacy-first, locally hosted Model Context Protocol (MCP) server that connects your AI agents directly to Google Calendar. 

Designed specifically to allow AI agents to manage exact-time reminders, follow-ups, and scheduled events (like job application deadlines) with native push notification support via `extendedProperties.private`.

## Architecture
This project is split into two phases:
1. **`mcp-server/`** *(Completed)*: A Node.js/TypeScript MCP server that exposes Google Calendar tools to any compatible AI.
2. **`gui-app/`** *(Upcoming)*: A companion Flutter desktop application providing a native visual dashboard and Markdown clipboard interoperability.

## Available Tools (MCP)
The following tools are exposed to AI agents via the MCP server:
- `list_calendars`: Retrieve all calendars available to the user.
- `list_events`: Fetch events for a specific calendar within an optional time range.
- `create_event`: Create an event/reminder with exact start/end times and inject hidden AI metadata natively.
- `update_event`: Modify an existing event (uses safe read-modify-write).
- `delete_event`: Remove an event from the calendar.
- `add_event_log`: Safely append a timestamped audit log to the visible description.
- `export_events_as_markdown`: Export a calendar as a standard Markdown checklist.
- `import_markdown_events`: Bulk-create reminders directly from a Markdown checklist.


## Documentation
- [Authentication Guide](docs/authentication.md) - How to set up Google Cloud credentials and generate your local tokens.

## Privacy First
All credentials are stored strictly in local `.env` files. No third-party gateways or cloud services are used to manage your tokens.

### Schema Documentation
- [AI Metadata Schema](docs/ai-metadata-schema.md) - Documentation on how we store and version the hidden AI data payloads.

### Agent Usage Guidelines
- **Pagination Limit:** Agents are strictly instructed not to paginate through `list_events` more than 3 times without explicit user consent to prevent API rate limits and timeouts.
- **Legacy Schemas:** Agents must check the `_schema_version` of hidden metadata and prompt the user if they encounter an unmappable legacy schema.

## Usage Examples (Natural Language)
> **Note:** By default, the assistant is trained to search your "Home" calendar. If you want it to look at a different calendar, just mention it by name (e.g., *"When am I free on my Work calendar this afternoon?"*).

If you have installed the bundled `calendar-assistant` skill, your AI agent will be able to handle natural language queries like a native personal assistant. Try asking your agent:

* **"What are the next events in my calendar for today?"**
* **"When do I have a meeting with Joe Bloggs next week?"** *(The agent natively parses the attendees/invitees array)*
* **"What is the Teams meeting link for the meeting I have right now?"** *(The agent checks location and conferenceData)*
* **"When am I actually free this afternoon across both my Home and Work calendars?"** *(The agent will execute parallel searches and merge the busy blocks)*

* **"When am I actually free this afternoon?"** *(The agent calculates white-space and reports available blocks)*
* **"Push my 2 PM meeting back by 30 minutes."**


## Required Agent Skills

Because raw MCP tools are powerful, this repository bundles **Agent Skills** that enforce behavioral safety guardrails (e.g., double-confirming before an AI touches your primary "Home" calendar). 

If you are setting up this MCP server on your own device, you **must** install these bundled skills into your AI's environment so your agent knows how to use the tools safely.

**Available Bundled Skills:**
- `link-calendar`: Prevents the AI from blindly picking standard calendars (Home, Birthdays) without double confirmation.
- `calendar-assistant`: Teaches the AI how to translate natural language queries into specific MCP tool actions, including attendee parsing and white-space finding.


**How to Install (Antigravity):**
You can install these skills globally or per-workspace. To install them into your global Antigravity configuration:
```bash
cp -r agent-skills/* ~/.gemini/config/skills/
```
*(For detailed instructions, see [agent-skills/README.md](agent-skills/README.md))*

### Product Documents
- [Product Requirements Document (PRD)](product-docs/PRD.md) - Project vision, use cases, and dual-layered data architecture.
