#!/bin/bash

# Launch script for Inventory project (Next.js Frontend Only)
# This script starts the frontend service
# and kills any existing instances

echo "Inventory Project Launch Script (Next.js Frontend)"
echo "================================================="

# Kill existing Next.js processes
echo "Stopping any existing frontend services..."
pkill -f "node.*next" || echo "No frontend processes running"
sleep 1

# Start frontend (Next.js)
echo "Starting frontend on port 3000..."
cd "$(dirname "$0")"

echo "================================================="
echo "Starting Next.js development server in the foreground..."
echo "Press Ctrl+C to stop the frontend service."
echo "================================================="

# Run npm run dev in the foreground
npm run dev

# The script will end when npm run dev is stopped (e.g., by Ctrl+C)
# No need for PID management or trap if run in foreground

echo "Frontend service stopped."
