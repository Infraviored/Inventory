#!/bin/bash

# Start both the Next.js frontend and the Flask backend

# Create a data directory if it doesn't exist
mkdir -p data

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
fi

if [ ! -d "api/venv" ]; then
  echo "Setting up Python virtual environment..."
  cd api
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  cd ..
fi

# Start the Flask backend
echo "Starting Flask backend..."
cd api
source venv/bin/activate
python3 app.py &
FLASK_PID=$!
cd ..

# Start the Next.js frontend
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

echo "Both servers are running!"
echo "- Frontend: http://localhost:3000"
echo "- Backend: http://localhost:5000"
echo "Press Ctrl+C to stop both servers."

# Wait for both processes
wait $FLASK_PID $NEXT_PID
