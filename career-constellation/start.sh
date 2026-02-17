#!/bin/bash

# Career Constellation Navigator - Startup Script

echo "🚀 Starting Career Constellation Navigator..."
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📁 Working directory: $SCRIPT_DIR"
echo ""

# Start Backend
echo "🔧 Setting up Python backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "  Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "  Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "  Installing Python dependencies..."
pip install -q -r requirements.txt

# Download spaCy model (optional, for better NLP)
echo "  Setting up NLP models..."
python3 -c "
try:
    import spacy
    spacy.load('en_core_web_sm')
except:
    print('  Note: spaCy model not found. Keyword extraction will use fallback method.')
" 2>/dev/null || true

echo "  ✓ Backend ready"
echo ""

# Start backend server in background
echo "🌐 Starting backend server on http://localhost:8000"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

cd "$SCRIPT_DIR"

# Start Frontend
echo ""
echo "⚛️  Setting up Next.js frontend..."
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "  Installing Node.js dependencies (this may take a few minutes)..."
    npm install
fi

echo "  ✓ Frontend ready"
echo ""

# Start frontend
echo "🎨 Starting frontend server on http://localhost:3000"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✨ Career Constellation Navigator is running!"
echo ""
echo "  📊 Backend API:  http://localhost:8000"
echo "  🌐 Frontend UI:  http://localhost:3000"
echo "  📚 API Docs:     http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop both servers"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Handle Ctrl+C
trap "
echo ''
echo '🛑 Shutting down servers...'
kill $BACKEND_PID 2>/dev/null
kill $FRONTEND_PID 2>/dev/null
echo '✓ Servers stopped'
exit 0
" SIGINT SIGTERM

# Wait for both processes
wait
