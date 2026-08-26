# Authentication Guide

Because this MCP server is privacy-first, it runs entirely locally. You will need to generate your own Google Cloud credentials to allow the server to talk to your calendar.

## Step 1: Google Cloud Console
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., "AI Calendar Reminders").
3. In the search bar, search for **Google Calendar API** and click **Enable**.

## Step 2: OAuth Consent Screen
1. Navigate to **APIs & Services > OAuth consent screen**.
2. Choose **External** (or Internal if you have a Google Workspace account) and click Create.
3. Fill in the required fields (App name, support email). You can skip the domain fields.
4. **Scopes:** 
   - Click the **"Add or Remove Scopes"** button.
   - In the filter box, search for **Google Calendar API**.
   - Check the box next to the scope with this exact URL: `https://www.googleapis.com/auth/calendar` *(Description: "See, edit, share, and permanently delete all the calendars...")*.
   - Click **Update**.
5. **Test Users:** Because your app will stay in "Testing" mode, you **must add your own Google email address** to the Test Users list.

## Step 3: Create Credentials
1. Navigate to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Select **Web application** as the application type.
4. Under **Authorized redirect URIs**, add exactly: `http://localhost:3000/oauth2callback`.
5. Click Create. You will receive a **Client ID** and **Client Secret**.

## Step 4: Configure the Server
1. In the `mcp-server/` folder, create a `.env` file (if it doesn't exist).
2. Add your credentials:
   ```env
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```

## Step 5: Generate the Token
1. Open your terminal and navigate to the `mcp-server/` folder.
2. Run the authentication script:
   ```bash
   npm run auth
   ```
3. This will open your web browser. Log in with the Google account you added as a Test User.
4. You will see a warning that the app is unverified (since you just created it). Click "Advanced" -> "Go to [App Name] (unsafe)".
5. Grant the calendar permissions.
6. The script will automatically intercept the callback and append `GOOGLE_REFRESH_TOKEN=...` to your `.env` file.
