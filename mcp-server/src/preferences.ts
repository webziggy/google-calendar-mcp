import * as fs from 'fs';
import * as path from 'path';

const PREFS_PATH = path.resolve(process.cwd(), 'calendar_preferences.md');

export async function readCalendarPreferences(): Promise<string> {
  if (fs.existsSync(PREFS_PATH)) {
    return fs.readFileSync(PREFS_PATH, 'utf8');
  }
  return "No preferences found. Please instruct the user to run the 'calendar-setup' skill.";
}

export async function writeCalendarPreferences(markdownContent: string): Promise<string> {
  fs.writeFileSync(PREFS_PATH, markdownContent, 'utf8');
  return "Preferences successfully saved to the MCP server.";
}
