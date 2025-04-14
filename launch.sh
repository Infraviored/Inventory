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

# Start backend (Flask API)
echo "Starting backend on port 5000..."
cd "$(dirname "$0")/api"
python app.py &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Get the current Manus computer ID if running in Manus
MANUS_ID=$(hostname | grep -o '[a-z0-9]*-[a-z0-9]*')
if [ -n "$MANUS_ID" ]; then
  # Running in Manus environment, use exposed port URL
  export NEXT_PUBLIC_API_BASE_URL="https://5000-$MANUS_ID.manus.computer"
  echo "Detected Manus environment: Setting API URL to $NEXT_PUBLIC_API_BASE_URL"
else
  # Local development
  export NEXT_PUBLIC_API_BASE_URL="http://localhost:5000"
  echo "Local environment: Setting API URL to $NEXT_PUBLIC_API_BASE_URL"
fi

# Start frontend (Next.js)
echo "Starting frontend on port 3000..."
cd "$(dirname "$0")"
NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL npm run dev &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo "==============================="
echo "Services started successfully!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:5000"
echo "API Proxy Configuration: $NEXT_PUBLIC_API_BASE_URL"
echo "==============================="
echo "Press Ctrl+C to stop all services"

# Wait for user to press Ctrl+C
trap "echo 'Stopping services...'; kill $FRONTEND_PID $BACKEND_PID; exit" INT
wait
