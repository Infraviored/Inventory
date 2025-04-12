import { NextRequest, NextResponse } from 'next/server';

// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const locationId = parseInt(params.id);

    if (isNaN(locationId)) {
      return NextResponse.json(
        { error: 'Invalid location ID' },
        { status: 400 }
      );
    }
    
    // Call Flask backend
    const url = `${API_BASE_URL}/locations/${locationId}/breadcrumbs`;
    console.log('Calling Flask API for breadcrumbs:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Flask API error: ${response.status}`);
    }
    
    const breadcrumbs = await response.json();
    return NextResponse.json(breadcrumbs);
  } catch (error: any) {
    console.error('Error fetching breadcrumbs from Flask API:', error);
    return NextResponse.json(
      { error: `Failed to fetch breadcrumbs: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
