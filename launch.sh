#!/bin/bash

# Launch script for Inventory project
# This script starts both the frontend and backend services
# and kills any existing instances

echo "Inventory Project Launch Script"
echo "==============================="

# Kill existing processes
echo "Stopping any existing services..."
pkill -f "node.*next" || echo "No frontend processes running"
pkill -f "python.*app.py" || echo "No backend processes running"
sleep 2

# Start frontend (Next.js)
echo "Starting frontend on port 3000..."
cd "$(dirname "$0")"
npm run dev &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

# Start backend (Flask API)
echo "Starting backend on port 5000..."
cd "$(dirname "$0")/api"
python app.py &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

echo "==============================="
echo "Services started successfully!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:5000"
echo "==============================="
echo "Press Ctrl+C to stop all services"

# Wait for user to press Ctrl+C
trap "echo 'Stopping services...'; kill $FRONTEND_PID $BACKEND_PID; exit" INT
wait
