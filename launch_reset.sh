#!/bin/bash

# Launch script for Inventory project WITH RESETS (Next.js Frontend Only)
# This script starts the frontend service,
# kills any existing instances, and CLEARS uploads.

echo "Inventory Project LAUNCH SCRIPT (WITH RESETS)"
echo "============================================="

# Kill existing Next.js processes
echo "Stopping any existing frontend services..."
pkill -f "node.*next" || echo "No frontend processes running"
sleep 1

# --- RESET ACTIONS --- 
echo "Performing reset actions..."

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"

# Delete database file (OBSOLETE PATH - COMMENTED OUT)
# DB_PATH="$SCRIPT_DIR/api/data/inventory.db"
# if [ -f "$DB_PATH" ]; then
#   echo "Deleting OLD database file: $DB_PATH"
#   rm -f "$DB_PATH"
# else
#   echo "OLD Database file path ($DB_PATH) not found, skipping delete."
# fi
# TODO: If reset should delete the *new* DB, add logic here to find and delete it (e.g., rm -f .data/inventory.db)
echo "Skipping database file deletion (old path obsolete)."

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
  echo "Uploads directory ($UPLOADS_DIR) not found, skipping clear."
fi
echo "Reset actions complete."
# --- END RESET ACTIONS ---

# Start frontend (Next.js)
echo "Starting frontend on port 3000..."
cd "$SCRIPT_DIR"
npm run dev &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo "============================================="
echo "Service started successfully after RESETS!"
echo "Frontend: http://localhost:3000"
echo "============================================="
echo "Press Ctrl+C to stop the frontend service"

# Wait for user to press Ctrl+C
trap "echo 'Stopping frontend...'; kill $FRONTEND_PID; exit" INT
wait 