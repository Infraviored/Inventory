import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { 
  getInventoryItems, 
  addInventoryItem,
  getInventoryItemById
} from '@/lib/memory-db';
import { generateUniqueFilename } from '@/lib/utils';
import fs from 'fs';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const regionId = searchParams.get('regionId');
    
    let items = getInventoryItems();
    
    // Filter by location and region if provided
    if (locationId) {
      items = items.filter(item => item.locationId === parseInt(locationId));
    }
    
    if (regionId) {
      items = items.filter(item => item.regionId === parseInt(regionId));
    }
    
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const quantityStr = formData.get('quantity') as string;
    const quantity = parseInt(quantityStr) || 1;
    const locationIdStr = formData.get('locationId') as string;
    const locationId = locationIdStr ? parseInt(locationIdStr) : null;
    const regionIdStr = formData.get('regionId') as string;
    const regionId = regionIdStr ? parseInt(regionIdStr) : null;
    const image = formData.get('image') as File;
    
    let imagePath = null;
    
    if (image) {
      const uniqueFilename = generateUniqueFilename(image.name);
      const buffer = Buffer.from(await image.arrayBuffer());
      
      await writeFile(path.join(UPLOADS_DIR, uniqueFilename), buffer);
      imagePath = uniqueFilename;
    }
    
    const itemId = addInventoryItem(
      name, 
      description || null, 
      quantity, 
      imagePath, 
      locationId, 
      regionId
    );
    
    const newItem = getInventoryItemById(itemId);
    
    return NextResponse.json({
      id: newItem.id,
      name: newItem.name,
      description: newItem.description,
      quantity: newItem.quantity,
      imagePath: newItem.imagePath ? `/uploads/${newItem.imagePath}` : null,
      locationId: newItem.locationId,
      locationName: newItem.locationName,
      regionId: newItem.regionId,
      regionName: newItem.regionName,
      createdAt: newItem.createdAt,
      updatedAt: newItem.updatedAt
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    );
  }
}
