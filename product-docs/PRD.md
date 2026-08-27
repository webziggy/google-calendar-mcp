# Product Requirements Document (PRD): AI Calendar Integration

## 1. Product Vision
To build a privacy-first, extensible bridge between AI agents and Google Calendar. By leveraging hidden metadata (`extendedProperties.private`), this system allows AI agents to schedule, track, and resume complex asynchronous workflows (CRM, CI/CD, project management) without cluttering the user's visible calendar.

## 2. Phased Architecture
- **Phase 2 (Frontend - Upcoming):** A dedicated macOS Flutter companion app designed strictly as an "AI Workflow Dashboard".

### Phase 2: Flutter Companion App (Sub-PRD)
The Flutter app is not a generic calendar replacement. It is a specialized, menu-bar anchored dashboard for interacting with asynchronous AI workflows stored in Google Calendar.

**1. Form Factor & Routing (Menu Bar App)**
* **The Mini-Dashboard:** The app lives primarily as a macOS System Tray / Menu Bar icon (using `tray_manager`). Clicking it drops down a sleek, frameless timeline.
* **The Full Window:** A "Pop Out" button detaches the dashboard into a standard resizable macOS window for heavier planning and settings configuration.

**2. AI-Managed Calendar Filtering**
* To avoid cluttering the UI with standard human meetings, the app reads the MCP server's `calendar_preferences.md` file. It exclusively polls and renders events from calendars strictly categorized as `AI-Managed`.

**3. Augmented UI Features**
* **Metadata Rendering:** Automatically decodes `ext_[id]` JSON payloads and renders them as beautiful cards (e.g., Jira tickets, Snoozed Contexts).
* **Audit Log Viewer:** Parses `[YYYY-MM-DD][AI]` log lines from the event description and renders them as a clean Chat/Timeline UI.
* **Context Resumption (1-Click Copy):** For "Snoozed" workflows, clicking an event instantly copies a formatted prompt or `conversation_id` to the macOS clipboard, allowing the user to paste it into their LLM to instantly resume a suspended workflow.

**4. Smart DND Engine & "Quick Focus"**
* **Routine DND:** Reads `calendar_preferences.md` to inherently silence non-critical macOS notifications outside of defined working hours.
* **Ad-Hoc DND:** Dynamically monitors the user's designated `Focus/Break Calendar`. If an active event is occurring on that calendar, the app instantly enters DND mode, acting as an OS-level mute switch.
* **Quick Focus Toggle:** A massive button in the menu bar dropdown that instantly injects a 1-hour block onto the Focus calendar via the API, immediately triggering Ad-Hoc DND.

- **Phase 1 (Backend - Active):** A local Model Context Protocol (MCP) server written in Node.js/TypeScript. Exposes safe, paginated, and rate-limited calendar tools to any compatible AI agent.
## 3. Core Use Cases (Agent Workflows)

The true power of this system lies in the `ext_payload` JSON. Standard calendar apps cannot store structured data without cluttering the visible description field. By using hidden metadata, AI agents can execute the following workflows:

### 1. "Snoozing" and Context-Resumption
* **The Scenario:** A user is in the middle of a complex coding problem or conversation with an AI, but needs to step away. They say, *"Remind me to finish debugging this database migration on Tuesday morning."*
* **The Execution:** The agent schedules an event for Tuesday. In the hidden metadata, it injects the `conversation_id` and `pending_action: "db_migration_fix"`. 
* **The Result:** On Tuesday, the user receives a native OS notification. When triggered, the AI reads the metadata, instantly regains the exact chat context, and resumes the workflow right where they left off.

### 2. Personal CRM & Automated Follow-ups
* **The Scenario:** A user sends an important outreach email and tells the agent *"Remind me to follow up if they don't reply in 4 days."*
* **The Execution:** The agent schedules the event. The hidden metadata stores the `email_thread_id` and a `relationship_context` summary. 
* **The Result:** When the event triggers, the agent can use an email API to check if a reply exists. If not, it automatically drafts a context-aware follow-up for the user's approval.

### 3. Content & Social Media Pipeline
* **The Scenario:** The user and AI brainstorm and write 5 different blog posts or social updates in local markdown files.
* **The Execution:** The AI uses the `import_markdown_events` tool to schedule all 5 across the month. The hidden metadata stores `file_path: "/docs/drafts/post_1.md"` and `platform: "LinkedIn"`.
* **The Result:** When the calendar event arrives, the agent reads the hidden file path, fetches the exact markdown document from the local disk, and asks, *"Are you ready to publish this?"*

### 4. Smart Meeting Briefings
* **The Scenario:** A user has a busy day of meetings on their primary calendar.
* **The Execution:** A background agent runs `list_events` every morning to cross-reference attendees. It uses `create_event` to block out 15 minutes *before* major meetings on the dedicated "AI Calendar". 
* **The Result:** The hidden metadata contains a generated briefing (summarizing the last 3 emails with that person or a LinkedIn profile link), ensuring the user is prepped without cluttering the main meeting invite.

### 5. Local Infrastructure / CI-CD Polling
* **The Scenario:** The user kicks off a massive local script or server deployment that will take hours and closes their laptop.
* **The Execution:** The agent schedules a check-in event for 6 hours from now. Metadata includes `server_ip` and `script_pid`. 
* **The Result:** When the reminder triggers, the agent wakes up, checks the system logs via SSH or local execution, and updates the calendar event title to either `✅ Deployment Success` or `❌ Deployment Failed`.

---

## 4. Architectural Proposal: Extensible Metadata Schema (v0.2.0)

**The Constraint:** Google Calendar's `extendedProperties.private` only accepts flat `String: String` key-value pairs. Keys have a 44-character limit, and values have a 1024-character limit.

**The Solution:** We split the schema into two logical tiers: **Core** (for the infrastructure/Flutter app) and **Ext** (for specific agent skills). We use stringified JSON for the extension payload to allow infinite nesting while respecting Google's flat-map constraint.

### Schema Structure
```json
{
  "_schema_version": "0.2.0",
  
  // CORE METADATA (System-level data, Do Not Touch)
  "core_managed_by": "Antigravity",
  "core_app_status": "active",       
  "core_priority": "high",           
  
  // NAMESPACED EXTENSIONS (Collision-proof)
  // Key format: ext_[extension_id]
  // Value format: Stringified JSON (up to 1024 chars)
  "ext_crm": "{\"thread_id\": \"123\", \"sentiment\": \"warm\"}",
  "ext_snooze": "{\"conversation_id\": \"abc-999\"}",
  "ext_cicd": "{\"build_url\": \"https://...\"}"
}
```

### Why this works perfectly:
1. **Zero Collisions:** If the CRM skill and the CI/CD skill both update the same event, they write to their own dedicated keys (`ext_crm` vs `ext_cicd`), preventing overwrites.
2. **Bypasses the 44-Character Limit:** Google Calendar restricts keys to 44 characters. Flattening extension properties (e.g., `ext_helloworld_thread_id`) risks hitting this limit. By storing stringified JSON inside `ext_[id]`, we keep keys short and leverage the much larger 1024-character value limit.
3. **Implicit Registry:** We don't even need a `core_extensions` routing table. The presence of the `ext_crm` key inherently tells the Flutter app and other agents exactly which extensions are attached to the event!

## 5. Global State & Preferences Engine
To ensure true autonomy, the MCP server acts as the central source of truth for agent configuration. Instead of relying on transient chat context, the server exposes `read_calendar_preferences` and `write_calendar_preferences` tools. These manage a global `calendar_preferences.md` file stored within the server itself. This file tracks Working Hours, Protected Breaks, Category mappings (Work/Personal), and explicit `accessRole` mappings to prevent illegal API mutations.

## 6. Multi-Account Philosophy (Zero-Code)
The system enforces a "Single-Tenant" OAuth model. To manage multiple accounts (e.g., Personal + Enterprise Workspace), users rely on native Google Calendar sharing. This respects strict IT firewalls while allowing the AI to natively parse the `accessRole` (Reader/Writer) of shared calendars, granting it full cross-calendar conflict resolution without complex multi-tenant token management.


## 7. Dual-Layered Data (Hidden State vs Visible Log)
To ensure the calendar remains human-readable without risking corruption to the JSON state:
- **Machine State (Hidden):** All core logic, IDs, and complex structures are stored exclusively in `extendedProperties.private` (subject to 44/1024 char limits).
- **Audit Log (Visible):** The event `description` field is strictly reserved as a human-readable audit log. AI agents use the `add_event_log` tool to append timestamped updates.

**Log Format Standard:**
```
---
[YYYY-MM-DD HH:MM GMT][AI] Checked the log of the server with the pid - and it was fine.
```
This ensures the user can open their standard Google Calendar app on their phone and instantly see exactly what the AI has been doing asynchronously in the background.
