#!/bin/bash

# Launch script for Inventory project (Next.js Frontend Only)
# This script starts the frontend service
# and kills any existing instances

echo "Inventory Project Launch Script (Next.js Frontend)"
echo "================================================="

# Kill existing Next.js processes
echo "Stopping any existing frontend services..."
pkill -f "node.*next" || echo "No frontend processes running"
sleep 1 # Shorter sleep as only one service to kill

# Start frontend (Next.js)
echo "Starting frontend on port 3000..."
cd "$(dirname "$0")"
# Remove NEXT_PUBLIC_API_BASE_URL as it's no longer needed
npm run dev &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo "================================================="
echo "Service started successfully!"
echo "Frontend: http://localhost:3000"
# Remove backend URL info
echo "================================================="
echo "Press Ctrl+C to stop the frontend service"

# Wait for user to press Ctrl+C
trap "echo 'Stopping frontend...'; kill $FRONTEND_PID; exit" INT
wait
