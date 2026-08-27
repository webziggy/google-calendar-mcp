# Product Requirements Document (PRD): AI Calendar Integration

## 1. Product Vision
To build a privacy-first, extensible bridge between AI agents and Google Calendar. By leveraging hidden metadata (`extendedProperties.private`), this system allows AI agents to schedule, track, and resume complex asynchronous workflows (CRM, CI/CD, project management) without cluttering the user's visible calendar.

## 2. Phased Architecture
- **Phase 1 (Backend - Active):** A local Model Context Protocol (MCP) server written in Node.js/TypeScript. Exposes safe, paginated, and rate-limited calendar tools to any compatible AI agent.
- **Phase 2 (Frontend - Upcoming):** A Flutter macOS companion desktop app. Provides a visual dashboard to monitor AI-managed events, filter by use-case, and easily copy/paste Markdown representations.

## 3. Core Use Cases (Agent Workflows)
1. **Context "Snoozing":** Pausing an AI conversation and scheduling an event to automatically resume it (with full context) on a specific day.
2. **Personal CRM:** Automatically scheduling follow-up reminders for emails. The AI can wake up, check if a reply was received, and draft a response.
3. **CI/CD & Long-Running Tasks:** Scheduling check-ins for long-running scripts or server deployments. The AI wakes up, checks the logs, and updates the calendar event with success/failure status.
4. **Content Pipelines:** Bulk importing markdown schedules for social media or blog posts, tying local file paths directly to calendar dates.

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
