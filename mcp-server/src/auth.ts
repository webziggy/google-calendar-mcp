import { google } from 'googleapis';
import * as path from 'path';
import * as fs from 'fs';

// Safely load .env without noisy stdout ads that corrupt MCP
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim();
        if (!process.env[key]) process.env[key] = val;
      }
    });
  }
} catch (e) {
  // Ignore missing .env
}

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in the .env file');
  }

  const oAuth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:3000/oauth2callback'
  );

  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (refreshToken) {
    oAuth2Client.setCredentials({
      refresh_token: refreshToken
    });
  }

  return oAuth2Client;
}

export function getCalendarClient() {
  const auth = getOAuth2Client();
  return google.calendar({ version: 'v3', auth });
}
