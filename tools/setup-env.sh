#!/bin/bash

# Navigate to the mcp-server directory relative to this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/../mcp-server" || exit

echo "Google Cloud Credentials Setup"
echo "------------------------------"
read -p "Enter Google Client ID: " cid
read -p "Enter Google Client Secret: " csec

echo -e "GOOGLE_CLIENT_ID=$cid\nGOOGLE_CLIENT_SECRET=$csec" > .env

echo ""
echo "✅ Credentials securely saved to mcp-server/.env!"
echo "You can now navigate to mcp-server/ and run: npm run auth"
