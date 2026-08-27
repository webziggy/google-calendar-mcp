import { google } from 'googleapis';
import * as path from 'path';
import * as fs from 'fs';
import { loadEncryptedToken, saveEncryptedToken } from './crypto.js';

// Safely load .env
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
} catch (e) {}

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

  // Migrate plain text refresh token if it exists in .env
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    saveEncryptedToken(process.env.GOOGLE_REFRESH_TOKEN);
    
    // Remove it from .env for security
    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*\n?/g, '');
    fs.writeFileSync(envPath, envContent, { mode: 0o600 }); // Secure .env too
    
    delete process.env.GOOGLE_REFRESH_TOKEN;
  }

  const refreshToken = loadEncryptedToken();
  if (refreshToken) {
    oAuth2Client.setCredentials({ refresh_token: refreshToken });
  }

  return oAuth2Client;
}

export function getCalendarClient() {
  const auth = getOAuth2Client();
  return google.calendar({ version: 'v3', auth });
}
