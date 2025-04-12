// Update API routes to use the in-memory database
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { 
  getLocations, 
  getChildLocations, 
  addLocation, 
  getLocationById 
} from '@/lib/memory-db';
import { generateUniqueFilename } from '@/lib/utils';
// Ensure uploads directory exists
import { mkdir } from 'fs/promises';
import fs from 'fs';
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const isRoot = searchParams.get('root');
    
    let locations;
    
    if (parentId) {
      locations = getChildLocations(parseInt(parentId));
    } else if (isRoot === 'true') {
      locations = getLocations().filter(loc => loc.parentId === null);
    } else {
      locations = getLocations();
    }
    
    // Transform the data to include full image paths
    const transformedLocations = locations.map(location => ({
      id: location.id,
      name: location.name,
      description: location.description,
      parentId: location.parentId,
      imagePath: location.imagePath ? `/uploads/${location.imagePath}` : null,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt
    }));
    
    return NextResponse.json(transformedLocations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const parentIdStr = formData.get('parentId') as string;
    const parentId = parentIdStr ? parseInt(parentIdStr) : null;
    const image = formData.get('image') as File;
    
    let imagePath = null;
    
    if (image) {
      const uniqueFilename = generateUniqueFilename(image.name);
      const buffer = Buffer.from(await image.arrayBuffer());
      
      await writeFile(path.join(UPLOADS_DIR, uniqueFilename), buffer);
      imagePath = uniqueFilename;
    }
    
    const locationId = addLocation(name, parentId, description || null, imagePath);
    
    const newLocation = getLocationById(locationId);
    
    return NextResponse.json({
      id: newLocation.id,
      name: newLocation.name,
      description: newLocation.description,
      parentId: newLocation.parentId,
      imagePath: newLocation.imagePath ? `/uploads/${newLocation.imagePath}` : null,
      createdAt: newLocation.createdAt,
      updatedAt: newLocation.updatedAt
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating location:', error);
    return NextResponse.json(
      { error: 'Failed to create location' },
      { status: 500 }
    );
  }
}
