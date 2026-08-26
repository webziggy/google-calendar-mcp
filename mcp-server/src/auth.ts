import { google } from 'googleapis';
import dotenv from 'dotenv';
import * as path from 'path';

// Ensure environment variables are loaded
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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
