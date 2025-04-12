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
    const url = `${API_BASE_URL}/locations/${locationId}/regions`;
    console.log('Calling Flask API for regions:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Flask API error: ${response.status}`);
    }
    
    const regions = await response.json();
    return NextResponse.json(regions);
  } catch (error: any) {
    console.error('Error fetching regions from Flask API:', error);
    return NextResponse.json(
      { error: `Failed to fetch regions: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function POST(
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
    
    // Get data from request
    const data = await request.json();
    
    // Call Flask backend
    console.log(`Creating region for location ID ${locationId} in Flask API`);
    const response = await fetch(`${API_BASE_URL}/locations/${locationId}/regions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Flask API error: ${response.status} - ${errorText}`);
    }
    
    const newRegion = await response.json();
    return NextResponse.json(newRegion, { status: 201 });
  } catch (error: any) {
    console.error('Error creating region via Flask API:', error);
    return NextResponse.json(
      { error: `Failed to create region: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
