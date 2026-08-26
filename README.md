# Google Calendar MCP Server (AI Reminders)

A privacy-first, locally hosted Model Context Protocol (MCP) server that connects your AI agents directly to Google Calendar. 

Designed specifically to allow AI agents to manage exact-time reminders, follow-ups, and scheduled events (like job application deadlines) with native push notification support via `extendedProperties.private`.

## Architecture
This project is split into two phases:
1. **`mcp-server/`**: A Node.js/TypeScript MCP server that exposes Google Calendar tools to any compatible AI.
2. **`gui-app/`** *(Upcoming)*: A companion Flutter desktop application providing a native visual dashboard and Markdown clipboard interoperability.

## Documentation
- [Authentication Guide](docs/authentication.md) - How to set up Google Cloud credentials and generate your local tokens.

## Privacy First
All credentials are stored strictly in local `.env` files. No third-party gateways or cloud services are used to manage your tokens.
