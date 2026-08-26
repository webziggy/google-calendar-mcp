# Documentation Standards

- **Proactive Updates:** Always proactively update project documentation (e.g., `README.md`, files in `docs/`) when reaching a stable state, finalizing a project phase, or making significant architectural or configuration changes. 
- **Do Not Wait:** Do not wait for the user to explicitly request documentation updates. Treat documentation as an integral part of completing any task.

# MCP Server & Skills Bundling

- **Co-development:** As you develop or modify an MCP server, you must proactively develop, update, and consolidate the associated Agent Skills required to use those tools safely and effectively.
- **Distribution:** Always bundle these skills within the repository (e.g., in an `agent-skills/` directory). Ensure there is documentation explaining how another user setting up the project on their own device can install these skills into their own `.agents/` workspace.
- **Guardrails:** Use these skills to define the behavioral safety guardrails (e.g., explicit user confirmations for sensitive actions) that cannot be easily enforced by the raw MCP tools alone.
