import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { readCalendarPreferences, writeCalendarPreferences } from "./preferences.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import {
  listCalendars,
  createCalendar,
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  appendEventLog
} from "./calendar.js";

import crypto from "crypto";
const stagedActions = new Map<string, { type: string; summary: string; payload: any; timestamp: number }>();


function getPendingWarning(currentToken: string) {
  if (stagedActions.size <= 1) return "";
  const others = Array.from(stagedActions.entries()).filter(([t]) => t !== currentToken);
  let msg = "\n\n⚠️ IMPORTANT: There are " + others.length + " other pending staged action(s) in the queue:\n";
  others.forEach(([t, a]) => { msg += `- ${t}: ${a.summary}\n`; });
  msg += "Please inform the user about these older pending actions and ask if they want to approve or cancel them as well.";
  return msg;
}

const server = new Server(
  {
    name: "google-calendar-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List all available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_calendars",
        description: "List all Google Calendars available to the user.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "create_calendar",
        description: "Create a new, dedicated Google Calendar.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" }
          },
          required: ["title"],
        },
      },
      {
        name: "list_events",
        description: "List events on a specific calendar. Returns a page of events and a nextPageToken if more exist.",
        inputSchema: {
          type: "object",
          properties: {
            calendarId: { type: "string" },
            timeMin: { type: "string", description: "RFC3339 timestamp. Omit to fetch from beginning of time." },
            timeMax: { type: "string", description: "RFC3339 timestamp" },
            pageToken: { type: "string", description: "Token for fetching the next page of results" },
            maxResults: { type: "number", description: "Defaults to 100" }
          },
          required: ["calendarId"],
        },
      },
      {
        name: "list_staged_actions",
        description: "View all pending staged actions that are waiting for user approval.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "cancel_staged_action",
        description: "Cancel a pending staged action, or all of them.",
        inputSchema: {
          type: "object",
          properties: {
            token: { type: "string", description: "The token of the action to cancel, or 'ALL' to clear the queue." }
          },
          required: ["token"],
        },
      },
      {
        name: "commit_staged_action",
        description: "Executes a staged CRUD operation on Google Calendar after the user has explicitly approved it.",
        inputSchema: {
          type: "object",
          properties: {
            token: { type: "string", description: "The unique token of the staged action." }
          },
          required: ["token"],
        },
      },
      {
        name: "stage_create_event",
        description: "Create a new event/reminder. Uses exact times.",
        inputSchema: {
          type: "object",
          properties: {
            calendarId: { type: "string", description: "Typically 'primary' or a specific calendar ID" },
            title: { type: "string" },
            description: { type: "string" },
            startTime: { type: "string", description: "RFC3339 timestamp" },
            endTime: { type: "string", description: "RFC3339 timestamp" },
            timeZone: { type: "string", description: "e.g., 'Europe/London'" },
            aiMetadata: { 
              type: "object", 
              description: "Key-value pairs (strings only) to store hidden state natively in the calendar event.",
              additionalProperties: { type: "string" }
            }
          },
          required: ["calendarId", "title"],
        },
      },
      {
        name: "stage_update_event",
        description: "Update an existing event. Uses read-modify-write to preserve existing data.",
        inputSchema: {
          type: "object",
          properties: {
            calendarId: { type: "string" },
            eventId: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            startTime: { type: "string" },
            endTime: { type: "string" },
            timeZone: { type: "string" },
            aiMetadata: { 
              type: "object",
              additionalProperties: { type: "string" }
            }
          },
          required: ["calendarId", "eventId"],
        },
      },
      {
        name: "add_event_log",
        description: "Safely append a timestamped, human-readable audit log to the event's visible description.",
        inputSchema: {
          type: "object",
          properties: {
            calendarId: { type: "string" },
            eventId: { type: "string" },
            message: { type: "string" }
          },
          required: ["calendarId", "eventId", "message"],
        },
      },
      {
        name: "stage_delete_event",
        description: "Delete an event from the calendar.",
        inputSchema: {
          type: "object",
          properties: {
            calendarId: { type: "string" },
            eventId: { type: "string" }
          },
          required: ["calendarId", "eventId"],
        },
      },
      {
        name: "export_events_as_markdown",
        description: "Export events from a calendar as a standard Markdown checklist.",
        inputSchema: {
          type: "object",
          properties: {
            calendarId: { type: "string" },
            timeMin: { type: "string" },
            timeMax: { type: "string" }
          },
          required: ["calendarId"],
        },
      },
      {
        name: "import_markdown_events",
        description: "Import a Markdown checklist and bulk-create reminders. Each line must be in the format: '- [ ] [YYYY-MM-DDTHH:mm:ssZ] Event Title'",
        inputSchema: {
          type: "object",
          properties: {
            calendarId: { type: "string" },
            markdownText: { type: "string", description: "The markdown text containing the checklist" }
          },
          required: ["calendarId", "markdownText"],
        },
      },
      {
        name: "read_calendar_preferences",
        description: "Read the globally saved calendar preferences (working hours, designated focus calendars, etc).",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "write_calendar_preferences",
        description: "Save the user's calendar preferences to the server.",
        inputSchema: {
          type: "object",
          properties: {
            markdownContent: { type: "string" }
          },
          required: ["markdownContent"],
        },
      }
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "list_calendars": {
        const calendars = await listCalendars();
        return { content: [{ type: "text", text: JSON.stringify(calendars, null, 2) }] };
      }
      
      case "create_calendar": {
        const { title, description } = request.params.arguments as any;
        const calendar = await createCalendar(title, description);
        return { content: [{ type: "text", text: JSON.stringify(calendar, null, 2) }] };
      }
      
      case "list_events": {
        const { calendarId, timeMin, timeMax, pageToken, maxResults } = request.params.arguments as any;
        const response = await listEvents(calendarId, timeMin, timeMax, pageToken, maxResults);
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      }
      
      case "list_staged_actions": {
        if (stagedActions.size === 0) {
          return { content: [{ type: "text", text: "No pending staged actions." }] };
        }
        const list = Array.from(stagedActions.entries()).map(([token, action]) => 
          `- Token: ${token} | Type: ${action.type} | Summary: ${action.summary}`
        ).join('\n');
        return { content: [{ type: "text", text: "Pending Staged Actions:\n" + list }] };
      }
      
      case "cancel_staged_action": {
        const { token } = request.params.arguments as any;
        if (token === "ALL") {
          const count = stagedActions.size;
          stagedActions.clear();
          return { content: [{ type: "text", text: `Cleared ${count} pending staged action(s).` }] };
        }
        if (stagedActions.has(token)) {
          stagedActions.delete(token);
          return { content: [{ type: "text", text: `Cancelled staged action: ${token}.` }] };
        }
        return { content: [{ type: "text", text: `Error: Token ${token} not found.` }] };
      }

      case "commit_staged_action": {
        const { token } = request.params.arguments as any;
        const action = stagedActions.get(token);
        
        if (!action) {
          return { content: [{ type: "text", text: `Error: Invalid or expired token ${token}.` }] };
        }
        
        let result = "";
        try {
          if (action.type === "CREATE") {
            const { calendarId, title, description, startTime, endTime, timeZone, aiMetadata } = action.payload;
            const event = await createEvent(calendarId, title, description, startTime, endTime, timeZone, aiMetadata);
            result = "SUCCESS: " + JSON.stringify(event, null, 2);
          } else if (action.type === "UPDATE") {
            const { calendarId, eventId, ...updates } = action.payload;
            const event = await updateEvent(calendarId, eventId, updates);
            result = "SUCCESS: " + JSON.stringify(event, null, 2);
          } else if (action.type === "DELETE") {
            const { calendarId, eventId } = action.payload;
            await deleteEvent(calendarId, eventId);
            result = "SUCCESS: Event deleted.";
          }
          
          stagedActions.delete(token); // Clear token
          return { content: [{ type: "text", text: result }] };
        } catch (e: any) {
          return { content: [{ type: "text", text: `Execution failed: ${e.message}` }] };
        }
      }

      case "stage_create_event": {
        const payload = request.params.arguments as any;
        const token = "REQ-" + crypto.randomBytes(4).toString("hex");
        
        stagedActions.set(token, {
          type: "CREATE",
          summary: `Create event '${payload.title}' on calendar ${payload.calendarId}`,
          payload,
          timestamp: Date.now()
        });
        
        const message = `Action staged successfully. Present the following summary to the user for approval: 
- Action: CREATE EVENT
- Title: ${payload.title}
- Calendar: ${payload.calendarId}
- Start: ${payload.startTime}

If the user explicitly approves, call commit_staged_action with token ${token}.`;
        return { content: [{ type: "text", text: message + getPendingWarning(token) }] };
      }

      case "stage_update_event": {
        const payload = request.params.arguments as any;
        const token = "REQ-" + crypto.randomBytes(4).toString("hex");
        
        stagedActions.set(token, {
          type: "UPDATE",
          summary: `Update event ${payload.eventId} on calendar ${payload.calendarId}`,
          payload,
          timestamp: Date.now()
        });
        
        const message = `Action staged successfully. Present the following summary to the user for approval: 
- Action: UPDATE EVENT
- Event ID: ${payload.eventId}
- Calendar: ${payload.calendarId}
- Fields to Update: ${Object.keys(payload).join(', ')}

If the user explicitly approves, call commit_staged_action with token ${token}.`;
        return { content: [{ type: "text", text: message + getPendingWarning(token) }] };
      }

      case "add_event_log": {
        const { calendarId, eventId, message } = request.params.arguments as any;
        // NOTE: appendEventLog must be imported at the top of the file, we will fix imports next.
        const event = await appendEventLog(calendarId, eventId, message);
        return { content: [{ type: "text", text: JSON.stringify(event, null, 2) }] };
      }
      
      case "stage_delete_event": {
        const payload = request.params.arguments as any;
        const token = "REQ-" + crypto.randomBytes(4).toString("hex");
        
        stagedActions.set(token, {
          type: "DELETE",
          summary: `Delete event ${payload.eventId} on calendar ${payload.calendarId}`,
          payload,
          timestamp: Date.now()
        });
        
        const message = `Action staged successfully. Present the following summary to the user for approval: 
- Action: DELETE EVENT
- Event ID: ${payload.eventId}
- Calendar: ${payload.calendarId}

If the user explicitly approves, call commit_staged_action with token ${token}.`;
        return { content: [{ type: "text", text: message + getPendingWarning(token) }] };
      }

      case "export_events_as_markdown": {
        const { calendarId, timeMin, timeMax } = request.params.arguments as any;
        let allEvents: any[] = [];
        let pToken: string | undefined = undefined;
        
        do {
          const res = await listEvents(calendarId, timeMin, timeMax, pToken);
          allEvents = allEvents.concat(res.events);
          pToken = res.nextPageToken || undefined;
        } while (pToken);
        
        const markdown = allEvents.map(e => {
          const time = e.start?.dateTime || e.start?.date || 'Unknown';
          return `- [ ] [${time}] ${e.summary}`;
        }).join('\n');
        
        return { content: [{ type: "text", text: markdown || "No events found." }] };
      }

      case "import_markdown_events": {
        const { calendarId, markdownText } = request.params.arguments as any;
        
        const lines = markdownText.split('\n');
        const regex = /^- \[(x| )\] \[([^\]]+)\] (.+)$/i;
        const created = [];

        for (const line of lines) {
          const match = line.match(regex);
          if (match) {
            const time = match[2];
            const title = match[3];
            // Only creating start time for simplicity in bulk import
            const event = await createEvent(calendarId, title, "Imported via Markdown", time, time);
            created.push(event);
          }
        }
        
        return { content: [{ type: "text", text: `Successfully imported ${created.length} events.` }] };
      }

      case "read_calendar_preferences": {
        const prefs = await readCalendarPreferences();
        return { content: [{ type: "text", text: prefs }] };
      }
      
      case "write_calendar_preferences": {
        const { markdownContent } = request.params.arguments as any;
        const res = await writeCalendarPreferences(markdownContent);
        return { content: [{ type: "text", text: res }] };
      }
      
      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error: any) {
    let errorMessage = error.message;
    if (errorMessage.includes('invalid_grant') || errorMessage.includes('No refresh token')) {
      errorMessage = `Google OAuth Token Expired or Invalid. Please open your terminal and run 'npm run auth' in the google-calendar-mcp directory to re-authenticate. (${errorMessage})`;
    }
    return {
      isError: true,
      content: [{ type: "text", text: `Error executing ${request.params.name}: ${errorMessage}` }]
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Google Calendar MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error starting server:", error);
  process.exit(1);
});
