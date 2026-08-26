import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import {
  listCalendars,
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent
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
        name: "list_events",
        description: "List events on a specific calendar. Time range is optional. Time filters must be RFC3339 strings.",
        inputSchema: {
          type: "object",
          properties: {
            calendarId: { type: "string" },
            timeMin: { type: "string", description: "RFC3339 timestamp (e.g., 2026-08-27T00:00:00Z)" },
            timeMax: { type: "string", description: "RFC3339 timestamp" }
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
      
      case "list_events": {
        const { calendarId, timeMin, timeMax } = request.params.arguments as any;
        const events = await listEvents(calendarId, timeMin, timeMax);
        return { content: [{ type: "text", text: JSON.stringify(events, null, 2) }] };
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
      
      case "delete_event": {
        const { calendarId, eventId } = request.params.arguments as any;
        await deleteEvent(calendarId, eventId);
        return { content: [{ type: "text", text: `Event ${eventId} successfully deleted.` }] };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error executing ${request.params.name}: ${error.message}` }]
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
