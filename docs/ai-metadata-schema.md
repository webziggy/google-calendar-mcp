# AI Metadata JSON Schema

This document outlines the schema for the hidden AI metadata injected into Google Calendar events. We use Google Calendar's `extendedProperties.private` payload to store arbitrary JSON data that is invisible to humans but perfectly readable by our agents.

## Current Version: `0.1-draft`
> **Note:** The schema is currently in draft mode as we figure out what fields are universally required. Once the data structure stabilizes across multiple AI workflows, we will finalize a `1.0` release.

### Schema Fields
When an agent writes to a calendar event, the Node.js MCP server automatically stamps the payload with the current schema version.

```json
{
  "_schema_version": "0.1-draft",
  "managed_by": "Antigravity",
  "conversation_id": "optional-uuid",
  "...": "Any arbitrary key-value pairs the calling Agent/Skill defines"
}
```

### Upgrading and Backward Compatibility
When building AI Skills that read events, always check the `_schema_version` key.
If you encounter a schema version older than the one your Skill expects, your Skill should gracefully handle the missing data or upgrade the payload using the `update_event` MCP tool.

### Handling Legacy Conflicts
If an agent encounters an older schema version and there is no direct mapping to the current version (e.g., a required field didn't exist in the old schema), the agent **must halt and explicitly prompt the user** for how to handle the data migration. Do not blindly overwrite legacy metadata without user consent if there is a conflict.
