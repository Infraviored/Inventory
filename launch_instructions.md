# Launch Script Documentation

## Overview
This document provides instructions for using the launch script to start both the frontend and backend services of the Inventory application.

## Prerequisites
- Node.js (v16 or higher)
- npm (v7 or higher)
- Python (v3.6 or higher)
- Flask and other Python dependencies installed

## Using the Launch Script

### Basic Usage
The launch script provides a simple way to start both the frontend and backend services with a single command:

```bash
./launch.sh
```

This script will:
1. Stop any existing frontend or backend processes
2. Start the Next.js frontend on port 3000
3. Start the Flask API backend on port 5000
4. Display the URLs for both services
5. Wait for user to press Ctrl+C to stop all services

### Accessing the Services
After running the launch script, you can access the services at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Stopping the Services
To stop both services, simply press Ctrl+C in the terminal where the launch script is running.

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   - If port 3000 or 5000 is already in use, you may need to manually kill the processes using those ports:
   ```bash
   sudo lsof -i :3000  # Find process using port 3000
   sudo lsof -i :5000  # Find process using port 5000
   kill -9 <PID>       # Kill the process with the given PID
   ```

2. **Permission Denied**
   - If you get a "Permission denied" error when running the script, make sure it's executable:
   ```bash
   chmod +x launch.sh
   ```

3. **Backend Dependencies**
   - If the backend fails to start, ensure all Python dependencies are installed:
   ```bash
   cd api
   pip install -r requirements.txt  # If a requirements.txt file exists
   ```

## For Development

If you need to modify the launch script, here's what each section does:

1. **Process Termination**: The script first attempts to kill any existing processes that might be using the required ports.
2. **Frontend Launch**: Starts the Next.js development server on port 3000.
3. **Backend Launch**: Starts the Flask API on port 5000.
4. **Signal Handling**: Sets up a trap for the SIGINT signal (Ctrl+C) to gracefully shut down both services.

## Notes
- The script uses relative paths, so it should be run from the root directory of the project.
- Both services run in the background, with their output directed to the current terminal.
- The script will wait indefinitely until terminated with Ctrl+C.
