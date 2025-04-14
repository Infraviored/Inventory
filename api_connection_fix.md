# API Connection Fix Documentation

## Issue Description

When deploying the Inventory application on Manus, users encountered an error when trying to access the locations page:

```
Error: Failed to fetch locations
```

This error occurred because the frontend could not successfully communicate with the backend API. The browser console showed a 500 error when attempting to fetch location data.

## Root Causes

After investigation, two issues were identified:

1. **Hardcoded Backend URL**: In `src/lib/storage-provider.ts`, the backend URL was hardcoded to a specific Manus instance:
   ```typescript
   return {
     mode: 'api',
     apiBaseUrl: 'https://5000-iwaqc4g1bjvhn91xj1poq-3a4debb8.manus.computer'
   };
   ```
   This caused the application to attempt to connect to a non-existent or inaccessible backend.

2. **API Proxy Caching Issues**: The API proxy in `src/app/api/proxy/[...path]/route.ts` did not have proper cache control settings, which could lead to stale data or connection issues.

## Solutions Implemented

### 1. Updated Storage Provider to Use Environment Variables

Modified `src/lib/storage-provider.ts` to use the environment variable instead of a hardcoded URL:

```typescript
// Use the Flask API backend that's running on port 5000
// Get the API base URL from the environment variable
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
console.log('Using API base URL:', apiBaseUrl);

return {
  mode: 'api',
  apiBaseUrl: apiBaseUrl
};
```

### 2. Improved API Proxy Configuration

Enhanced the API proxy in `src/app/api/proxy/[...path]/route.ts` with:

1. **Disabled Caching**: Added `cache: 'no-store'` and `next: { revalidate: 0 }` to ensure fresh data.
2. **Better Error Handling**: Added more detailed error logging to help diagnose issues.

```typescript
const response = await fetch(backendUrl, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
  cache: 'no-store', // Disable caching to ensure fresh data
  next: { revalidate: 0 }, // Disable Next.js cache
});

if (!response.ok) {
  console.error(`Backend API error: Status ${response.status}`);
  const errorText = await response.text();
  console.error(`Error response: ${errorText}`);
  throw new Error(`Backend API error: ${response.status}`);
}
```

## Deployment Instructions

When deploying the application on Manus:

1. Ensure the `.env.local` file contains the correct backend URL:
   ```
   NEXT_PUBLIC_API_BASE_URL=https://5000-[your-manus-id].manus.computer
   ```

2. Restart both frontend and backend services:
   ```bash
   ./launch.sh
   ```

3. Expose both ports:
   - Frontend: Port 3000
   - Backend: Port 5000

4. Verify the connection by navigating to the locations page.

## Preventing Future Issues

To prevent similar issues in the future:

1. **Avoid Hardcoded URLs**: Always use environment variables for configuration.
2. **Test API Connectivity**: After deployment, verify that the frontend can communicate with the backend.
3. **Check Environment Variables**: Ensure environment variables are properly set and loaded.
4. **Monitor Console Errors**: Pay attention to browser console errors for API connectivity issues.

## Additional Notes

The application uses a Next.js API proxy to communicate with the Flask backend. This proxy is configured in `src/app/api/proxy/[...path]/route.ts` and relies on the `NEXT_PUBLIC_API_BASE_URL` environment variable to know where to forward requests.

When running locally, this variable defaults to `http://localhost:5000`. When running on Manus, it should be set to the exposed backend URL.
