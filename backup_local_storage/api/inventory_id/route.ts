import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { 
  getInventoryItemById, 
  updateInventoryItem, 
  deleteInventoryItem,
  deleteItemTags,
  addItemTag
} from '@/lib/db';
import { generateUniqueFilename, extractTags } from '@/lib/utils';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const item = getInventoryItemById(id);
    
    if (!item) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      id: item.id,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      imagePath: item.image_path ? `/uploads/${item.image_path}` : null,
      locationId: item.location_id,
      locationName: item.location_name,
      regionId: item.region_id,
      regionName: item.region_name,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory item' },
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
    const quantityStr = formData.get('quantity') as string;
    const quantity = parseInt(quantityStr) || 1;
    const locationIdStr = formData.get('locationId') as string;
    const locationId = locationIdStr ? parseInt(locationIdStr) : null;
    const regionIdStr = formData.get('regionId') as string;
    const regionId = regionIdStr ? parseInt(regionIdStr) : null;
    const image = formData.get('image') as File;
    
    const existingItem = getInventoryItemById(id);
    
    if (!existingItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }
    
    let imagePath = existingItem.image_path;
    
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
    
    updateInventoryItem(
      id,
      name,
      description || null,
      quantity,
      imagePath,
      locationId,
      regionId
    );
    
    // Update tags
    deleteItemTags(id);
    const tags = extractTags(name, description);
    for (const tag of tags) {
      addItemTag(id, tag);
    }
    
    const updatedItem = getInventoryItemById(id);
    
    return NextResponse.json({
      id: updatedItem.id,
      name: updatedItem.name,
      description: updatedItem.description,
      quantity: updatedItem.quantity,
      imagePath: updatedItem.image_path ? `/uploads/${updatedItem.image_path}` : null,
      locationId: updatedItem.location_id,
      locationName: updatedItem.location_name,
      regionId: updatedItem.region_id,
      regionName: updatedItem.region_name,
      createdAt: updatedItem.created_at,
      updatedAt: updatedItem.updated_at
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
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
    
    const existingItem = getInventoryItemById(id);
    
    if (!existingItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }
    
    // Delete associated image if it exists
    if (existingItem.image_path && fs.existsSync(path.join(UPLOADS_DIR, existingItem.image_path))) {
      fs.unlinkSync(path.join(UPLOADS_DIR, existingItem.image_path));
    }
    
    // Delete tags
    deleteItemTags(id);
    
    // Delete item
    deleteInventoryItem(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to delete inventory item' },
      { status: 500 }
    );
  }
}
