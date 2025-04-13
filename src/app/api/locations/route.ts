// Updated API route to use the storage provider instead of Flask backend
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { generateUniqueFilename } from '@/lib/utils';
import { StorageProvider } from '@/lib/storage-provider';

// Ensure uploads directory exists
import { mkdir } from 'fs/promises';
import fs from 'fs';
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initialize storage provider
const storage = new StorageProvider();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const isRoot = searchParams.get('root');
    
    let locations;
    if (parentId) {
      locations = await storage.getLocationsByParentId(parseInt(parentId));
    } else if (isRoot === 'true') {
      locations = await storage.getRootLocations();
    } else {
      locations = await storage.getAllLocations();
    }
    
    return NextResponse.json(locations);
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
    
    // Extract location data
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || null;
    const parentId = formData.get('parentId') ? parseInt(formData.get('parentId') as string) : null;
    const locationType = formData.get('locationType') as string || null;
    
    // Handle image upload if present
    let imagePath = null;
    const image = formData.get('image') as File;
    if (image && image.size > 0) {
      const filename = generateUniqueFilename(image.name);
      const filePath = path.join(UPLOADS_DIR, filename);
      const buffer = Buffer.from(await image.arrayBuffer());
      await writeFile(filePath, buffer);
      imagePath = `/uploads/${filename}`;
    }
    
    // Create location in storage
    const newLocation = await storage.createLocation({
      name,
      description,
      parentId,
      imagePath,
      locationType
    });
    
    // Handle regions if provided
    const regionsJson = formData.get('regions') as string;
    if (regionsJson) {
      const regions = JSON.parse(regionsJson);
      for (const region of regions) {
        await storage.createRegion(newLocation.id, {
          name: region.name,
          x: region.x,
          y: region.y,
          width: region.width,
          height: region.height,
          color: region.color || null
        });
      }
    }
    
    return NextResponse.json(newLocation, { status: 201 });
  } catch (error: any) {
    console.error('Error creating location:', error);
    return NextResponse.json(
      { error: `Failed to create location: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
