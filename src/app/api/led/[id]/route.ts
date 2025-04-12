import { NextRequest, NextResponse } from 'next/server';

// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

// This API will be used by microcontrollers to activate LEDs at the correct locations
// when objects are found through the search interface

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itemId = parseInt(params.id);
    
    if (isNaN(itemId)) {
      return NextResponse.json(
        { error: 'Invalid item ID' },
        { status: 400 }
      );
    }
    
    // Call Flask backend
    const url = `${API_BASE_URL}/led/${itemId}`;
    console.log('Calling Flask API for LED activation:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Item not found' },
          { status: 404 }
        );
      }
      
      if (response.status === 400) {
        return NextResponse.json(
          { error: 'Item does not have a specific location with region' },
          { status: 400 }
        );
      }
      
      throw new Error(`Flask API error: ${response.status}`);
    }
    
    const ledData = await response.json();
    return NextResponse.json(ledData);
  } catch (error: any) {
    console.error('Error fetching LED activation data via Flask API:', error);
    return NextResponse.json(
      { error: `Failed to fetch LED activation data: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
