import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { 
  getLocationById, 
  updateLocation, 
  deleteLocation 
} from '@/lib/db';
import { generateUniqueFilename } from '@/lib/utils';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const location = getLocationById(id);
    
    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      id: location.id,
      name: location.name,
      description: location.description,
      parentId: location.parent_id,
      imagePath: location.image_path ? `/uploads/${location.image_path}` : null,
      createdAt: location.created_at,
      updatedAt: location.updated_at
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const parentIdStr = formData.get('parentId') as string;
    const parentId = parentIdStr ? parseInt(parentIdStr) : null;
    const image = formData.get('image') as File;
    
    const existingLocation = getLocationById(id);
    
    if (!existingLocation) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }
    
    let imagePath = existingLocation.image_path;
    
    if (image) {
      // Delete old image if it exists
      if (imagePath && fs.existsSync(path.join(UPLOADS_DIR, imagePath))) {
        fs.unlinkSync(path.join(UPLOADS_DIR, imagePath));
      }
      
      const uniqueFilename = generateUniqueFilename(image.name);
      const buffer = Buffer.from(await image.arrayBuffer());
      
      await writeFile(path.join(UPLOADS_DIR, uniqueFilename), buffer);
      imagePath = uniqueFilename;
    }
    
    updateLocation(id, name, parentId, description || null, imagePath);
    
    const updatedLocation = getLocationById(id);
    
    return NextResponse.json({
      id: updatedLocation.id,
      name: updatedLocation.name,
      description: updatedLocation.description,
      parentId: updatedLocation.parent_id,
      imagePath: updatedLocation.image_path ? `/uploads/${updatedLocation.image_path}` : null,
      createdAt: updatedLocation.created_at,
      updatedAt: updatedLocation.updated_at
    });
  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    const existingLocation = getLocationById(id);
    
    if (!existingLocation) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }
    
    // Delete associated image if it exists
    if (existingLocation.image_path && fs.existsSync(path.join(UPLOADS_DIR, existingLocation.image_path))) {
      fs.unlinkSync(path.join(UPLOADS_DIR, existingLocation.image_path));
    }
    
    deleteLocation(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json(
      { error: 'Failed to delete location' },
      { status: 500 }
    );
  }
}
