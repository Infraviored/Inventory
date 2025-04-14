# API Proxy Configuration

## Overview
This document explains how the API proxy works in the Inventory application and how to properly configure it for development and deployment.

## How the API Proxy Works

The Inventory application uses a Next.js API proxy to forward requests from the frontend to the Flask backend. This approach:

1. Keeps all frontend API requests relative (e.g., `/api/locations`)
2. Handles CORS issues automatically
3. Simplifies deployment by abstracting the backend URL

## Configuration

### Current Implementation

The API proxy is implemented in:
- `/src/app/api/proxy/[...path]/route.ts` - Catch-all API route handler
- `/src/lib/api.ts` - Frontend API client that uses the proxy

### Issue with Hardcoded URLs

The current implementation has the backend URL hardcoded in the proxy route file:
```typescript
const backendUrl = `https://5000-iwaqc4g1bjvhn91xj1poq-3a4debb8.manus.computer/api/${path}${queryString ? `?${queryString}` : ''}`;
```

This causes issues when:
- The backend URL changes (e.g., different Manus computer instance)
- Running locally without exposing ports
- Deploying to production

### Solution: Environment-Based Configuration

To fix this, we need to:
1. Use environment variables for the backend URL
2. Update the launch script to set these variables
3. Ensure the proxy uses the correct URL in all environments

## Required Changes

1. Update the proxy route to use environment variables:
```typescript
// Get backend URL from environment variable or use default for local development
const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const backendUrl = `${backendBaseUrl}/api/${path}${queryString ? `?${queryString}` : ''}`;
```

2. Set the environment variable in the launch script:
```bash
# For local development
export NEXT_PUBLIC_API_BASE_URL=http://localhost:5000

# For Manus computer with exposed ports
export NEXT_PUBLIC_API_BASE_URL=https://5000-[your-manus-id].manus.computer
```

## Troubleshooting

If you encounter API connectivity issues:

1. Check that both frontend and backend services are running
2. Verify the backend URL is correctly set in the environment
3. Check browser console for specific error messages
4. Ensure the proxy route is correctly forwarding requests

## Testing the Connection

To test if the API proxy is working correctly:

1. Start both frontend and backend services
2. Open the browser console
3. Navigate to the locations page
4. Check for successful API requests to `/api/locations`
5. If errors occur, check the specific error message for clues
