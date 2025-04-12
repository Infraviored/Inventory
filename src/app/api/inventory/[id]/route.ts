import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { generateUniqueFilename } from '@/lib/utils';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

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
    const url = `${API_BASE_URL}/inventory/${itemId}`;
    console.log('Calling Flask API:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Inventory item not found' },
          { status: 404 }
        );
      }
      
      throw new Error(`Flask API error: ${response.status}`);
    }
    
    const item = await response.json();
    return NextResponse.json(item);
  } catch (error: any) {
    console.error('Error fetching inventory item from Flask API:', error);
    return NextResponse.json(
      { error: `Failed to fetch inventory item: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    
    const formData = await request.formData();
    // Create a new FormData to send to Flask
    const flaskFormData = new FormData();
    
    // Copy all fields from the request formData
    for (const [key, value] of formData.entries()) {
      flaskFormData.append(key, value);
    }
    
    // Call Flask backend
    console.log(`Updating inventory item ID ${itemId} in Flask API`);
    const response = await fetch(`${API_BASE_URL}/inventory/${itemId}`, {
      method: 'PUT',
      body: flaskFormData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Flask API error: ${response.status} - ${errorText}`);
    }
    
    const updatedItem = await response.json();
    return NextResponse.json(updatedItem);
  } catch (error: any) {
    console.error('Error updating inventory item via Flask API:', error);
    return NextResponse.json(
      { error: `Failed to update inventory item: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    console.log(`Deleting inventory item ID ${itemId} from Flask API`);
    const response = await fetch(`${API_BASE_URL}/inventory/${itemId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Flask API error: ${response.status} - ${errorText}`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting inventory item via Flask API:', error);
    return NextResponse.json(
      { error: `Failed to delete inventory item: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}