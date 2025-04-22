// Updated API route to use the storage provider instead of Flask backend
import { NextRequest, NextResponse } from 'next/server';
import { StorageProvider } from '@/lib/storage-provider';

// Initialize storage provider
const storage = new StorageProvider();

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const locationId = parseInt(params.id);
    
    // Get the regions for this location
    const regions = await storage.getLocationRegions(locationId);
    
    return NextResponse.json(regions);
  } catch (error) {
    console.error(`Error fetching regions for location ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch regions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params; // Destructure the 'id' property
    const locationId = parseInt(id); // Parse the destructured 'id'
    const region = await request.json();
    
    // Create the region
    const newRegion = await storage.createRegion(locationId, region);
    
    return NextResponse.json(newRegion, { status: 201 });
  } catch (error: any) {
    console.error(`Error creating region for location ${params.id}:`, error);
    return NextResponse.json(
      { error: `Failed to create region: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
