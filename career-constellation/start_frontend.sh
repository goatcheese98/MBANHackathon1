#!/bin/bash

cd /Users/rohanjasani/Desktop/Hackathon/career-constellation/frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

echo "🎨 Starting frontend on http://localhost:3000"
echo ""

npm run dev
