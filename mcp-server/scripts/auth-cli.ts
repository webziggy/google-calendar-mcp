import { getOAuth2Client } from '../src/auth.js';
import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Ensure .env is loaded to catch existing client IDs
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const PORT = 3000;

async function authenticate() {
  const oAuth2Client = getOAuth2Client();

  const authorizeUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Forces re-consent to ensure we get a refresh token
    scope: SCOPES,
  });

  console.log('\n==================================================');
  console.log('1. Go to this URL to authorize the application:');
  console.log(authorizeUrl);
  console.log('==================================================\n');
  console.log(`Waiting for Google callback on http://localhost:${PORT}/oauth2callback...`);

  const server = http.createServer(async (req, res) => {
    try {
      if (req.url && req.url.startsWith('/oauth2callback')) {
        const qs = new url.URL(req.url, `http://localhost:${PORT}`).searchParams;
        const code = qs.get('code');

        if (code) {
          console.log('\nAuthorization code received! Exchanging for tokens...');
          res.end('Authorization successful! You can close this tab and return to the terminal.');
          
          const { tokens } = await oAuth2Client.getToken(code);
          
          if (tokens.refresh_token) {
            const envPath = path.resolve(process.cwd(), '.env');
            let envContent = '';
            if (fs.existsSync(envPath)) {
              envContent = fs.readFileSync(envPath, 'utf-8');
            }
            
            if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
               envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*/g, `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
            } else {
               envContent += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
            }
            
            fs.writeFileSync(envPath, envContent);
            console.log('✅ Refresh token successfully saved to .env file!');
          } else {
            console.log('⚠️ No refresh token received. You might need to revoke access in your Google Account and try again.');
          }
          
          server.close();
          process.exit(0);
        } else {
          res.end('No code found in the callback URL.');
          server.close();
          process.exit(1);
        }
      }
    } catch (error) {
      console.error('Error during token exchange:', error);
      res.end('Authentication failed. Check terminal for details.');
      server.close();
      process.exit(1);
    }
  });

  server.listen(PORT);
}

authenticate().catch((err) => {
  console.error('\n❌ Authentication failed:', err.message);
  process.exit(1);
});
