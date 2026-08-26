# Privacy Policy

**Effective Date:** August 2026

This Privacy Policy applies to the "Google Calendar MCP Server" (the "Application").

## 1. Data Collection and Usage
This Application is a completely local, open-source tool. It requests access to your Google Calendar data strictly to allow you to interact with your own calendar via a local AI agent (using the Model Context Protocol). 
* **We do not collect, transmit, or store your personal data on any external servers.** 
* All calendar data fetched by this Application remains entirely on your local machine.

## 2. Authentication
The Application uses OAuth 2.0 to authenticate with Google. Your authentication tokens (`client_id`, `client_secret`, and `refresh_token`) are stored locally on your hard drive in a hidden `.env` file. They are never transmitted to us or any third party.

## 3. Third-Party Sharing
Because this Application runs locally on your machine, no data is shared with or sold to third parties.

## 4. Your Control
You are in full control of your data. You can revoke this Application's access to your Google Calendar at any time by visiting your [Google Account Security Settings](https://myaccount.google.com/permissions).

## 5. Changes to this Policy
As this is an open-source tool, this privacy policy may be updated as new features (such as the Flutter Companion App) are added. All changes will be documented in this repository.
