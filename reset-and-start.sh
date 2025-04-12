#!/bin/bash

# Reset database and start both servers

echo "Stopping any running servers..."
pkill -f "python3 app.py" || true
pkill -f "npm run dev" || true

echo "Removing Flask database file..."
rm -f api/data/inventory.db

echo "Creating database directories..."
mkdir -p api/data

echo "Starting the Flask backend and Next.js frontend..."
cd api
source venv/bin/activate
python3 app.py &
FLASK_PID=$!
cd ..

echo "Starting Next.js frontend..."
npm run dev &
NEXT_PID=$!

# Function to handle script termination
cleanup() {
  echo "Shutting down servers..."
  kill $FLASK_PID
  kill $NEXT_PID
  exit 0
}

# Register the cleanup function for script termination
trap cleanup SIGINT SIGTERM

echo "Servers are now running!"
echo "- Flask backend: http://localhost:5000"
echo "- Next.js frontend: http://localhost:3000"
echo "Press Ctrl+C to stop all servers."

# Wait for servers to finish
wait $FLASK_PID $NEXT_PID 