// Updated API route to use the storage provider instead of Flask backend
import { NextRequest, NextResponse } from 'next/server';
import { StorageProvider } from '@/lib/storage-provider';

// Initialize storage provider
const storage = new StorageProvider();

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const locationId = parseInt(params.id);
    
    // Get the location by ID
    const location = await storage.getLocationById(locationId);
    
    return NextResponse.json(location);
  } catch (error) {
    console.error(`Error fetching location ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const locationId = parseInt(params.id);
    const formData = await request.formData();
    
    // Update the location
    const updatedLocation = await storage.updateLocation(locationId, formData);
    
    return NextResponse.json(updatedLocation);
  } catch (error: any) {
    console.error(`Error updating location ${params.id}:`, error);
    return NextResponse.json(
      { error: `Failed to update location: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const locationId = parseInt(params.id);
    
    // Delete the location
    await storage.deleteLocation(locationId);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`Error deleting location ${params.id}:`, error);
    return NextResponse.json(
      { error: `Failed to delete location: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
