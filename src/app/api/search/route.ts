import { NextRequest, NextResponse } from 'next/server';

// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json([]);
    }
    
    // Call Flask backend
    const url = `${API_BASE_URL}/search?q=${encodeURIComponent(query)}`;
    console.log('Calling Flask API for search:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Flask API error: ${response.status}`);
    }
    
    const results = await response.json();
    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error searching items via Flask API:', error);
    return NextResponse.json(
      { error: `Failed to search items: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
