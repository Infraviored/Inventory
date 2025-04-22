#!/bin/bash

# Launch script for Inventory project WITH FULL RESET
# This script starts both the frontend and backend services,
# kills any existing instances, DELETES the database, and CLEARS uploads.

echo "Inventory Project LAUNCH SCRIPT (WITH RESET)"
echo "============================================"

# Kill existing processes
echo "Stopping any existing services..."
pkill -f "node.*next" || echo "No frontend processes running"
pkill -f "python.*app.py" || echo "No backend processes running"
sleep 2

# --- RESET ACTIONS --- 
echo "Performing reset actions..."

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"

# Delete database file
DB_PATH="$SCRIPT_DIR/api/data/inventory.db"
if [ -f "$DB_PATH" ]; then
  echo "Deleting database file: $DB_PATH"
  rm -f "$DB_PATH"
else
  echo "Database file not found, skipping delete."
fi

# Clear uploads directory
UPLOADS_DIR="$SCRIPT_DIR/public/uploads"
if [ -d "$UPLOADS_DIR" ]; then
  echo "Clearing uploads directory: $UPLOADS_DIR"
  # Remove contents, but keep the directory itself
  rm -rf "$UPLOADS_DIR"/*
  # Optional: Add a .gitkeep if you want the directory to persist in git even when empty
  # touch "$UPLOADS_DIR/.gitkeep"
echo "Uploads directory cleared."
else
  echo "Uploads directory not found, skipping clear."
fi
echo "Reset actions complete."
# --- END RESET ACTIONS ---

# Check for available port
# Port 5000 is often used by Docker, so we'll default to 5001
BACKEND_PORT=5001
echo "Using port $BACKEND_PORT for backend (port 5000 is typically used by Docker)"

# Start backend (Flask API)
echo "Starting backend on port $BACKEND_PORT... (Database will be re-initialized)"
cd "$SCRIPT_DIR/api"
# Ensure venv activation works even if script is called from elsewhere
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
else
    echo "Warning: venv not found or activate script missing in api/venv/bin/"
fi
export FLASK_PORT=$BACKEND_PORT
python app.py &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait for backend to start (give it time to initialize DB)
echo "Waiting for backend to start and initialize database..."
sleep 5 # Increased sleep time slightly for DB init

# Get the current Manus computer ID if running in Manus
MANUS_ID=$(hostname | grep -o '[a-z0-9]*-[a-z0-9]*')
if [ -n "$MANUS_ID" ]; then
  # Running in Manus environment, use exposed port URL
  export NEXT_PUBLIC_API_BASE_URL="https://$BACKEND_PORT-$MANUS_ID.manus.computer"
  echo "Detected Manus environment: Setting API URL to $NEXT_PUBLIC_API_BASE_URL"
else
  # Local development
  export NEXT_PUBLIC_API_BASE_URL="http://localhost:$BACKEND_PORT"
  echo "Local environment: Setting API URL to $NEXT_PUBLIC_API_BASE_URL"
fi

# Start frontend (Next.js)
echo "Starting frontend on port 3000..."
cd "$SCRIPT_DIR"
NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL npm run dev &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo "============================================"
echo "Services started successfully after RESET!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:$BACKEND_PORT"
echo "API Proxy Configuration: $NEXT_PUBLIC_API_BASE_URL"
echo "============================================"
echo "Press Ctrl+C to stop all services"

# Wait for user to press Ctrl+C
trap "echo 'Stopping services...'; kill $FRONTEND_PID $BACKEND_PID; exit" INT
wait 