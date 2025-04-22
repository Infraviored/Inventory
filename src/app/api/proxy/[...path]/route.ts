import { NextRequest, NextResponse } from 'next/server';

// Helper to copy essential headers, excluding problematic ones for fetch
function copyHeaders(headers: Headers): Headers {
  const newHeaders = new Headers();
  headers.forEach((value, key) => {
    // Exclude headers that fetch might automatically set or that cause issues
    if (!['host', 'connection', 'content-length', 'content-type'].includes(key.toLowerCase())) {
      newHeaders.append(key, value);
    }
  });
  return newHeaders;
}

// This is a catch-all API route that proxies requests to the Flask backend
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const { path: pathSegments } = params; // Destructure for consistency
    const path = pathSegments.join('/');
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
    const backendUrl = `${backendBaseUrl}/api/${path}${queryString ? `?${queryString}` : ''}`;
    console.log(`Proxying GET request to: ${backendUrl}`);
    
    const headers = copyHeaders(request.headers);
    // Add default content type if needed, though GET usually doesn't have a body
    if (!headers.has('Content-Type')) {
        headers.append('Content-Type', 'application/json'); 
    }

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: headers,
      cache: 'no-store',
      next: { revalidate: 0 },
    });
    
    if (!response.ok) {
      console.error(`Backend API error: Status ${response.status}`);
      const errorText = await response.text();
      console.error(`Error response: ${errorText}`);
      throw new Error(`Backend API error: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Proxy error (GET ${params.path.join('/')}): ${error}`);
    return NextResponse.json({ error: 'Failed to fetch data from backend' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const { path: pathSegments } = params;
    const path = pathSegments.join('/');
    const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
    const backendUrl = `${backendBaseUrl}/api/${path}`;
    console.log(`Proxying POST request to: ${backendUrl}`);
    
    // DO NOT read body as JSON. Pass the request body stream directly.
    // Let fetch handle the Content-Type for FormData.
    const headers = copyHeaders(request.headers); 

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: headers, // Pass cleaned headers
      body: request.body, // Pass the incoming request body stream
      // For streaming FormData, duplex might be required by some servers/fetch versions
      // @ts-ignore
      duplex: 'half' 
    });
    
    if (!response.ok) {
        console.error(`Backend API error (POST ${path}): Status ${response.status}`);
        const errorText = await response.text();
        console.error(`Error response: ${errorText}`);
        throw new Error(`Backend API error: ${response.status} - ${errorText}`);
    }
    
    // Handle potential empty response or non-JSON response from backend
    const contentType = response.headers.get('content-type');
    if (response.status === 204 || !contentType || !contentType.includes('application/json')) {
        // Return successful response even if body is empty or not JSON
        return new NextResponse(null, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Proxy error (POST ${params.path.join('/')}): ${error}`);
    return NextResponse.json({ error: 'Failed to post data to backend' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const { path: pathSegments } = params;
    const path = pathSegments.join('/');
    const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
    const backendUrl = `${backendBaseUrl}/api/${path}`;
    console.log(`Proxying PUT request to: ${backendUrl}`);
    
    // Handle both JSON and FormData for PUT requests
    const contentType = request.headers.get('content-type');
    let body: BodyInit | null = null;
    const headers = copyHeaders(request.headers);

    if (contentType && contentType.includes('application/json')) {
        // If JSON, read and stringify
        const jsonData = await request.json();
        body = JSON.stringify(jsonData);
        // Ensure Content-Type is set correctly
        if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }    
    } else {
        // Assume FormData or other types, pass the stream directly
        body = request.body;
        // Let fetch determine Content-Type for FormData
    }

    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: headers,
      body: body, // Pass either stringified JSON or the body stream
      // @ts-ignore
      duplex: 'half' // May be needed for streaming
    });
    
    if (!response.ok) {
        console.error(`Backend API error (PUT ${path}): Status ${response.status}`);
        const errorText = await response.text();
        console.error(`Error response: ${errorText}`);
        throw new Error(`Backend API error: ${response.status} - ${errorText}`);
    }

    // Handle potential empty response or non-JSON response
    const responseContentType = response.headers.get('content-type');
    if (response.status === 204 || !responseContentType || !responseContentType.includes('application/json')) {
        return new NextResponse(null, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Proxy error (PUT ${params.path.join('/')}): ${error}`);
    return NextResponse.json({ error: 'Failed to update data in backend' }, { status: 500 });
  }
}

// DELETE remains largely the same as it doesn't typically handle request bodies
export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const { path: pathSegments } = params; // Destructure the 'path' array
    const path = pathSegments.join('/'); // Join the destructured array
    
    const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
    const backendUrl = `${backendBaseUrl}/api/${path}`;
    console.log(`Proxying DELETE request to: ${backendUrl}`);

    const headers = copyHeaders(request.headers);
    
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: headers, // Pass cleaned headers
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error(`Backend API error (DELETE ${path}): Status ${response.status}`);
      const errorText = await response.text();
      console.error(`Error response: ${errorText}`);
      throw new Error(`Backend API error: ${response.status} - ${errorText}`);
    }
    
    // Handle potential empty/non-JSON response for DELETE
    const contentType = response.headers.get('content-type');
    if (response.status === 204 || !contentType || !contentType.includes('application/json')) {
        return new NextResponse(null, { status: response.status }); // Return empty success
    }
    
    // Try to parse JSON if available
    try {
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.log('DELETE successful, but response was not valid JSON.');
        return new NextResponse(null, { status: response.status }); // Still success
    }

  } catch (error) {
    console.error(`Proxy error (DELETE ${params.path.join('/')}): ${error}`);
    return NextResponse.json({ error: 'Failed to delete data from backend' }, { status: 500 });
  }
}
