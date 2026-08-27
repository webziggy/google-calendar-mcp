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
        name: "create_event",
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
        name: "update_event",
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
        name: "delete_event",
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
      
      case "create_event": {
        const { calendarId, title, description, startTime, endTime, timeZone, aiMetadata } = request.params.arguments as any;
        const event = await createEvent(calendarId, title, description, startTime, endTime, timeZone, aiMetadata);
        return { content: [{ type: "text", text: JSON.stringify(event, null, 2) }] };
      }
      
      case "update_event": {
        const { calendarId, eventId, ...updates } = request.params.arguments as any;
        const event = await updateEvent(calendarId, eventId, updates);
        return { content: [{ type: "text", text: JSON.stringify(event, null, 2) }] };
      }

      case "add_event_log": {
        const { calendarId, eventId, message } = request.params.arguments as any;
        // NOTE: appendEventLog must be imported at the top of the file, we will fix imports next.
        const event = await appendEventLog(calendarId, eventId, message);
        return { content: [{ type: "text", text: JSON.stringify(event, null, 2) }] };
      }
      
      case "delete_event": {
        const { calendarId, eventId } = request.params.arguments as any;
        await deleteEvent(calendarId, eventId);
        return { content: [{ type: "text", text: `Event ${eventId} successfully deleted.` }] };
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
