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
- `stage_create_event`: Stage a new event/reminder in the local server buffer.
- `stage_update_event`: Stage a modification to an existing event.
- `stage_delete_event`: Stage the removal of an event.
- `commit_staged_action`: Execute a staged action after explicit user approval, using its cryptographic token.
- `list_staged_actions` / `get_staged_action` / `cancel_staged_action`: Manage the pending approval queue.
- `read_calendar_preferences`: Retrieve the user's global working hours and routing rules.
- `write_calendar_preferences`: Save the user's global working hours and routing rules.

- `add_event_log`: Safely append a timestamped audit log to the visible description.
- `export_events_as_markdown`: Export a calendar as a standard Markdown checklist.
- `import_markdown_events`: Bulk-create reminders directly from a Markdown checklist.


## Documentation
- [Authentication Guide](docs/authentication.md) - How to set up Google Cloud credentials and generate your local tokens.

## Privacy First
All credentials are stored strictly in local `.env` files. No third-party gateways or cloud services are used to manage your tokens.

### Schema Documentation
- [Calendar Preferences Example](docs/calendar_preferences.example.md) - A documented dummy version of the global `calendar_preferences.md` routing file.

- [AI Metadata Schema](docs/ai-metadata-schema.md) - Documentation on how we store and version the hidden AI data payloads.

### Agent Usage Guidelines
- **Pagination Limit:** Agents are strictly instructed not to paginate through `list_events` more than 3 times without explicit user consent to prevent API rate limits and timeouts.
- **Legacy Schemas:** Agents must check the `_schema_version` of hidden metadata and prompt the user if they encounter an unmappable legacy schema.

## 🛡️ Security: The Staged Execution Pipeline
Calendar data is highly sensitive. To physically prevent an AI from hallucinating and blindly modifying or deleting your events, this MCP server enforces a **Staged Execution Pipeline**.

1. **Staging:** The AI **cannot** write to the Google Calendar API directly. It must call a `stage_` tool (e.g., `stage_delete_event`). 
2. **The Buffer:** The server caches the payload locally and generates a cryptographic token (e.g., `REQ-a1b2c3`).
3. **User Approval:** The server forcefully intercepts the AI's tool call, injecting a prompt that commands the AI to stop and ask the user for explicit permission to proceed.
4. **Execution:** Only if the user says "yes" can the AI call `commit_staged_action` with the required token.

If the AI stages multiple jobs and forgets about them, the server becomes self-aware of its own queue and natively injects ⚠️ Warnings into future tool responses, forcing the AI to ask you to clear the ghost jobs!

## Handling Multiple Accounts (Personal + Work)
Many users need to manage both a personal Google Calendar and an enterprise Google Workspace calendar. 

**Architectural Decision:** We intentionally enforce a "Single-Tenant, Zero-Code" architecture. Instead of configuring multiple OAuth tokens in the MCP server, you should use Google Calendar's native sharing features. Share your Work calendar with your Personal email address (or vice-versa). 

**Why we chose this approach:**
1. **IT Compliance:** It respects your employer's Google Workspace permissions. If IT blocks external sharing, the AI cannot bypass that firewall.
2. **Native Role-Based Access (RBAC):** The Google API inherently returns an `accessRole` (`owner`, `writer`, `reader`) for shared calendars. The agent natively parses this, knowing instantly if it can schedule meetings on your Work calendar or only read them.
3. **Zero Context-Switching:** You only authenticate the MCP server once. The AI sees a unified timeline across all your identities and can perform cross-calendar conflict resolution seamlessly.


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
- `calendar-setup`: An interactive onboarding workflow to categorize your calendars, define custom working hours, and generate a hand-editable `calendar_preferences.md` file.

- `daily-briefing`: A morning executive briefing that analyzes schedule congestion, checks for missed lunch breaks, and proactively blocks focus time on your designated personal calendar.




**How to Install (Antigravity):**
You can install these skills globally or per-workspace. To install them into your global Antigravity configuration:
```bash
cp -r agent-skills/* ~/.gemini/config/skills/
```
*(For detailed instructions, see [agent-skills/README.md](agent-skills/README.md))*

### Product Documents
- [Product Requirements Document (PRD)](product-docs/PRD.md) - Project vision, use cases, and dual-layered data architecture.
