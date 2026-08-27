# Documentation Standards

- **Proactive Updates:** Always proactively update project documentation (e.g., `README.md`, files in `docs/`) when reaching a stable state, finalizing a project phase, or making significant architectural or configuration changes. 
- **Do Not Wait:** Do not wait for the user to explicitly request documentation updates. Treat documentation as an integral part of completing any task.

# MCP Server & Skills Bundling

- **Co-development:** As you develop or modify an MCP server, you must proactively develop, update, and consolidate the associated Agent Skills required to use those tools safely and effectively.
- **Distribution:** Always bundle these skills within the repository (e.g., in an `agent-skills/` directory). Ensure there is documentation explaining how another user setting up the project on their own device can install these skills into their own `.agents/` workspace.
- **Guardrails:** Use these skills to define the behavioral safety guardrails (e.g., explicit user confirmations for sensitive actions) that cannot be easily enforced by the raw MCP tools alone.

# Data Versioning and Upgrades

- **Schema Checking:** When reading payloads (such as the hidden `extendedProperties.private` in calendar events), always check the `_schema_version`.
- **Conflict Resolution:** If you encounter a legacy schema version and there is *any* ambiguity or conflict on how to map it to the current version, DO NOT guess or forcefully overwrite the data. You must explicitly prompt the user for instructions on how they would like to handle or upgrade the legacy payload.

# MCP Execution & Stream Hygiene

- **No Wrappers:** Never configure an MCP server to run via `npm run`, `npx`, or loaders like `tsx` in production configurations (e.g., `mcp_config.json`). These wrappers pollute standard output (`stdout`) with status messages, which instantly corrupts the JSON-RPC stream.
- **Compile to Raw JS:** Always compile TypeScript MCP servers down to raw JavaScript (e.g., `build/index.js`) and execute them using pure `node`.
- **Silent Dependencies:** Avoid dependencies (like standard `dotenv` CLI loaders) that inject initialization logs or sponsor ads into `stdout`. If needed, parse `.env` files natively.

# Payload Versioning

- **Semantic Versioning:** Always use strict Semantic Versioning (SemVer: `MAJOR.MINOR.PATCH`, e.g., `0.1.0`) when versioning AI data schemas or JSON payloads. Avoid arbitrary string tags so that agents can reliably compute version comparisons.

# MCP Tool Design: Pagination & Timeouts

- **Expose Pagination to AI:** When building MCP tools that fetch lists or query APIs, NEVER use internal `do/while` loops to fetch all pages in a single tool execution. Always expose pagination (e.g., `pageToken`, `limit`, `offset`) as arguments in the tool schema.
- **Why?** Internal loops can run for 30+ seconds, causing fatal timeouts and leaving the user completely blind to progress. Forcing the AI to paginate manually via multiple sequential tool calls naturally communicates progress to the user via the chat UI.
- **Agent Self-Regulation:** When an agent is manually paginating via an MCP tool, it must act as a circuit breaker. Do not automatically paginate more than 3 times in a row. If the dataset requires more pages, stop and prompt the user for explicit permission to continue fetching.
