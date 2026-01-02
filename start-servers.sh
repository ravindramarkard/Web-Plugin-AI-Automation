#!/bin/bash

# Start both backend and frontend servers

echo "🚀 Starting AITestGen servers..."
echo ""

# Function to check if port is in use
check_port() {
    lsof -ti:$1 > /dev/null 2>&1
}

# Check and kill existing processes on ports 3001 and 5173
if check_port 3001; then
    echo "⚠️  Port 3001 is in use. Killing existing process..."
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

if check_port 5173; then
    echo "⚠️  Port 5173 is in use. Killing existing process..."
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Start backend server
echo "📦 Starting backend server on http://localhost:3001..."
cd server
pnpm dev > ../server.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to initialize
sleep 3

# Check if backend started successfully
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend server is running!"
else
    echo "❌ Backend server failed to start. Check server.log for errors."
    exit 1
fi

# Start frontend server
echo "🌐 Starting frontend server on http://localhost:5173..."
cd pages/web-app
pnpm dev > ../../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ../..

# Wait for frontend to initialize
sleep 3

echo ""
echo "✨ Both servers are starting!"
echo ""
echo "📊 Backend:  http://localhost:3001"
echo "🌐 Frontend: http://localhost:5173"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f server.log"
echo "   Frontend: tail -f frontend.log"
echo ""
echo "🛑 To stop servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop both servers..."

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait

