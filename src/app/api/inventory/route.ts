import { NextRequest, NextResponse } from 'next/server';

// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Build query string passing along any parameters
    const params = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
      params.append(key, value);
    }
    
    // Call Flask backend
    const url = `${API_BASE_URL}/inventory${params.toString() ? `?${params.toString()}` : ''}`;
    console.log('Calling Flask API:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Flask API error: ${response.status}`);
    }
    
    const items = await response.json();
    return NextResponse.json(items);
  } catch (error: any) {
    console.error('Error fetching inventory from Flask API:', error);
    return NextResponse.json(
      { error: `Failed to fetch inventory items: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    // Create a new FormData to send to Flask
    const flaskFormData = new FormData();
    
    // Copy all fields from the request formData
    for (const [key, value] of formData.entries()) {
      flaskFormData.append(key, value);
    }
    
    // Call Flask backend
    console.log('Posting new inventory item to Flask API');
    const response = await fetch(`${API_BASE_URL}/inventory`, {
      method: 'POST',
      body: flaskFormData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Flask API error: ${response.status} - ${errorText}`);
    }
    
    const newItem = await response.json();
    return NextResponse.json(newItem, { status: 201 });
  } catch (error: any) {
    console.error('Error creating inventory item via Flask API:', error);
    return NextResponse.json(
      { error: `Failed to create inventory item: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
