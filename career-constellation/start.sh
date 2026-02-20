#!/bin/bash

# Start TypeScript RAG Backend + Frontend
echo "🚀 Starting Career Constellation (TypeScript RAG Backend)"
echo ""

# Kill any existing processes
pkill -f "tsx server" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "python main.py" 2>/dev/null || true
pkill -f "uvicorn" 2>/dev/null || true

# Start TypeScript RAG backend
echo "📡 Starting TypeScript RAG Backend..."
cd backend-ts
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Both servers started!"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  RAG:      Enabled with OpenAI GPT-4o-mini"
echo ""
echo "Features:"
echo "  ✅ 622 jobs from CSV"
echo "  ✅ 6 research reports"
echo "  ✅ AI Chat with RAG"
echo "  ✅ TypeScript Backend (No Python!)"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
