#!/bin/bash

# Script to push Schulplaner to GitHub
# Run this script: bash push.sh

echo "🚀 Pushing Schulplaner to GitHub..."
echo ""
echo "You'll be prompted for your GitHub credentials."
echo "Username: jm861"
echo "Password: Use a Personal Access Token (not your GitHub password)"
echo ""
echo "To create a token: https://github.com/settings/tokens"
echo "Select 'repo' scope when creating the token."
echo ""
read -p "Press Enter to continue..."

cd "$(dirname "$0")"
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "View your repository at: https://github.com/jm861/schulplaner"
else
    echo ""
    echo "❌ Push failed. Please check your credentials."
    echo ""
    echo "Alternative: Use a Personal Access Token directly:"
    echo "git push https://YOUR_TOKEN@github.com/jm861/schulplaner.git main"
fi

