# Product Requirements Document (PRD): AI Calendar Integration

## 1. Product Vision
To build a privacy-first, extensible bridge between AI agents and Google Calendar. By leveraging hidden metadata (`extendedProperties.private`), this system allows AI agents to schedule, track, and resume complex asynchronous workflows (CRM, CI/CD, project management) without cluttering the user's visible calendar.

## 2. Phased Architecture
- **Phase 1 (Backend - Active):** A local Model Context Protocol (MCP) server written in Node.js/TypeScript. Exposes safe, paginated, and rate-limited calendar tools to any compatible AI agent.
- **Phase 2 (Frontend - Upcoming):** A Flutter macOS companion desktop app. Provides a visual dashboard to monitor AI-managed events, filter by use-case, and easily copy/paste Markdown representations.

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
