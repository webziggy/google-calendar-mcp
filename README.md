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

## Documentation
- [Authentication Guide](docs/authentication.md) - How to set up Google Cloud credentials and generate your local tokens.

## Privacy First
All credentials are stored strictly in local `.env` files. No third-party gateways or cloud services are used to manage your tokens.

### Schema Documentation
- [AI Metadata Schema](docs/ai-metadata-schema.md) - Documentation on how we store and version the hidden AI data payloads.

### Agent Usage Guidelines
- **Pagination Limit:** Agents are strictly instructed not to paginate through `list_events` more than 3 times without explicit user consent to prevent API rate limits and timeouts.
- **Legacy Schemas:** Agents must check the `_schema_version` of hidden metadata and prompt the user if they encounter an unmappable legacy schema.
