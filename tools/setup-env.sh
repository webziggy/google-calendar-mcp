#!/bin/bash

# Navigate to the mcp-server directory relative to this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/../mcp-server" || exit

echo "Google Cloud Credentials Setup"
echo "------------------------------"

if [ -n "$1" ]; then
    if [ -f "$1" ]; then
        echo "Extracting credentials from $1..."
        # Using Python to safely parse JSON since it's pre-installed on macOS (avoids needing jq)
        cid=$(python3 -c "import sys, json; print(json.load(open(sys.argv[1]))['web'].get('client_id', ''))" "$1")
        csec=$(python3 -c "import sys, json; print(json.load(open(sys.argv[1]))['web'].get('client_secret', ''))" "$1")
        
        if [ -z "$cid" ] || [ -z "$csec" ]; then
            echo "❌ Failed to extract client_id or client_secret from JSON."
            echo "Make sure it's a valid 'Web application' OAuth credentials file."
            exit 1
        fi
    else
        echo "❌ Error: File '$1' not found!"
        exit 1
    fi
else
    echo "💡 Tip: You can also just pass the downloaded JSON file as an argument:"
    echo "     ./tools/setup-env.sh ~/Downloads/client_secret_xxx.json"
    echo ""
    read -p "Enter Google Client ID: " cid
    read -p "Enter Google Client Secret: " csec
fi

echo -e "GOOGLE_CLIENT_ID=$cid\nGOOGLE_CLIENT_SECRET=$csec" > .env

echo ""
echo "✅ Credentials securely saved to mcp-server/.env!"
echo "You can now navigate to mcp-server/ and run: npm run auth"
