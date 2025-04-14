import { NextRequest, NextResponse } from 'next/server';

// This is a catch-all API route that proxies requests to the Flask backend
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Get backend URL from environment variable or use default for local development
    const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
    const backendUrl = `${backendBaseUrl}/api/${path}${queryString ? `?${queryString}` : ''}`;
    console.log(`Proxying GET request to: ${backendUrl}`);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Proxy error: ${error}`);
    return NextResponse.json({ error: 'Failed to fetch data from backend' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    // Get backend URL from environment variable or use default for local development
    const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
    const backendUrl = `${backendBaseUrl}/api/${path}`;
    console.log(`Proxying POST request to: ${backendUrl}`);
    
    const body = await request.json();
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Proxy error: ${error}`);
    return NextResponse.json({ error: 'Failed to post data to backend' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    // Get backend URL from environment variable or use default for local development
    const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
    const backendUrl = `${backendBaseUrl}/api/${path}`;
    console.log(`Proxying PUT request to: ${backendUrl}`);
    
    const body = await request.json();
    
    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Proxy error: ${error}`);
    return NextResponse.json({ error: 'Failed to update data in backend' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    // Get backend URL from environment variable or use default for local development
    const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
    const backendUrl = `${backendBaseUrl}/api/${path}`;
    console.log(`Proxying DELETE request to: ${backendUrl}`);
    
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Proxy error: ${error}`);
    return NextResponse.json({ error: 'Failed to delete data from backend' }, { status: 500 });
  }
}
