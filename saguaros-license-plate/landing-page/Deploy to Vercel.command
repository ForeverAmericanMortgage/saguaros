#!/bin/bash
# One-Click Vercel Deploy for Blackout Plate Landing Page
# Just double-click this file to deploy!

cd "$(dirname "$0")"

echo ""
echo "🚀 Deploying the Blackout Plate landing page to Vercel..."
echo ""

# Check if npx is available (comes with Node.js)
if ! command -v npx &> /dev/null; then
    echo "❌ Node.js is required. Installing via Homebrew..."
    if command -v brew &> /dev/null; then
        brew install node
    else
        echo "Please install Node.js from https://nodejs.org"
        echo ""
        read -p "Press Enter to exit..."
        exit 1
    fi
fi

echo "📦 Running Vercel deploy..."
echo ""

npx vercel --yes

echo ""
echo "✅ Done! Your site should be live."
echo ""
read -p "Press Enter to close this window..."
