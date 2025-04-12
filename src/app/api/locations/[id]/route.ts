import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { generateUniqueFilename } from '@/lib/utils';

// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

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
    const url = `${API_BASE_URL}/locations/${locationId}`;
    console.log('Calling Flask API:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Location not found' },
          { status: 404 }
        );
      }
      
      throw new Error(`Flask API error: ${response.status}`);
    }
    
    const location = await response.json();
    return NextResponse.json(location);
  } catch (error: any) {
    console.error('Error fetching location from Flask API:', error);
    return NextResponse.json(
      { error: `Failed to fetch location: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    
    const formData = await request.formData();
    // Create a new FormData to send to Flask
    const flaskFormData = new FormData();
    
    // Copy all fields from the request formData
    for (const [key, value] of formData.entries()) {
      flaskFormData.append(key, value);
    }
    
    // Call Flask backend
    console.log(`Updating location ID ${locationId} in Flask API`);
    const response = await fetch(`${API_BASE_URL}/locations/${locationId}`, {
      method: 'PUT',
      body: flaskFormData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Flask API error: ${response.status} - ${errorText}`);
    }
    
    const updatedLocation = await response.json();
    return NextResponse.json(updatedLocation);
  } catch (error: any) {
    console.error('Error updating location via Flask API:', error);
    return NextResponse.json(
      { error: `Failed to update location: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    console.log(`Deleting location ID ${locationId} from Flask API`);
    const response = await fetch(`${API_BASE_URL}/locations/${locationId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Flask API error: ${response.status} - ${errorText}`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting location via Flask API:', error);
    return NextResponse.json(
      { error: `Failed to delete location: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
