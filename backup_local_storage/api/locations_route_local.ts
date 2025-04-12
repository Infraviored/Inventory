// Update API routes to use the Flask backend API
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { generateUniqueFilename } from '@/lib/utils';
// Ensure uploads directory exists
import { mkdir } from 'fs/promises';
import fs from 'fs';
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const isRoot = searchParams.get('root');
    
    // Build the query string
    const params = new URLSearchParams();
    if (parentId) {
      params.append('parentId', parentId);
    }
    if (isRoot === 'true') {
      params.append('root', 'true');
    }

    // Call Flask backend
    const url = `${API_BASE_URL}/locations${params.toString() ? `?${params.toString()}` : ''}`;
    console.log('Calling Flask API:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Flask API error: ${response.status}`);
    }
    
    const locations = await response.json();
    return NextResponse.json(locations);
  } catch (error) {
    console.error('Error fetching locations from Flask API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
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
    console.log('Posting new location to Flask API');
    const response = await fetch(`${API_BASE_URL}/locations`, {
      method: 'POST',
      body: flaskFormData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Flask API error: ${response.status} - ${errorText}`);
    }
    
    const newLocation = await response.json();
    return NextResponse.json(newLocation, { status: 201 });
  } catch (error: any) {
    console.error('Error creating location via Flask API:', error);
    return NextResponse.json(
      { error: `Failed to create location: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
