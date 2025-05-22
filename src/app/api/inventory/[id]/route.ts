import { NextRequest, NextResponse } from 'next/server';
import {
    getItemById as getItemByIdFromDb,
    updateItem as updateItemInDb,
    deleteItem as deleteItemInDb,
    getLocationById as getLocationByIdFromDb, // For validation during update
    Item, // Import type from new db lib
    Location // For location name resolution
} from '@lib/db';
// import { saveUpload, deleteUpload } from '@lib/file-handler'; // Temporarily remove for simplification

// Helper to format item data for API response
function formatApiResponseItem(item: Item, location?: Location): any { 
    if (!item) return null;
    return {
        id: item.id,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        locationId: item.location_id,
        regionId: item.region_id,
        imagePath: item.imagePath, // JSON DB stores the direct path or name
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        tags: item.tags || [],
        locationName: location ? location.name : null,
        // TODO: regionName: if needed, fetch region from location.regions using item.region_id
    };
}

// GET /api/inventory/:id - Fetches a specific item
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const itemId = parseInt(params.id);
        if (isNaN(itemId)) {
            return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
        }

        const item = getItemByIdFromDb(itemId);

        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        // Fetch location to include locationName in the response
        let itemLocation: Location | undefined;
        if (item.location_id) {
            itemLocation = getLocationByIdFromDb(item.location_id);
        }
        
        console.log(`[JSON_DB_API] Fetched item ${itemId}`);
        return NextResponse.json(formatApiResponseItem(item, itemLocation));
    } catch (error: any) {
        console.error(`[JSON_DB_API] Error fetching item ${params.id}:`, error);
        return NextResponse.json({ error: `Failed to fetch item: ${error.message}` }, { status: 500 });
    }
}

// PUT /api/inventory/:id - Updates a specific item
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const itemId = parseInt(params.id);
        if (isNaN(itemId)) {
            return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
        }

        const formData = await request.formData();
        console.log(`[JSON_DB_API] PUT /inventory/${itemId} FormData keys:`, Array.from(formData.keys()));

        const name = formData.get('name') as string | null;
        const description = formData.get('description') as string | null;
        const quantityStr = formData.get('quantity') as string | null;
        const locationIdStr = formData.get('locationId') as string | null;
        const regionIdStr = formData.get('regionId') as string | null;
        const imageFile = formData.get('image') as File | null;
        const clearImage = formData.get('clearImage') === 'true';
        const tagsJson = formData.get('tags') as string | null;

        const updateData: Partial<Omit<Item, 'id' | 'createdAt' | 'updatedAt'>> = {};

        if (name !== null) updateData.name = name;
        if (description !== undefined) updateData.description = description; // Allow setting to null or empty string
        if (quantityStr !== null) {
            const quantity = parseInt(quantityStr);
            if (isNaN(quantity)) return NextResponse.json({ error: 'Invalid quantity format' }, { status: 400 });
            updateData.quantity = quantity;
        }
        if (locationIdStr !== null) {
            const locationId = parseInt(locationIdStr);
            if (isNaN(locationId)) return NextResponse.json({ error: 'Invalid locationId format' }, { status: 400 });
            updateData.location_id = locationId;
        }
        if (regionIdStr !== undefined) { // Allow regionId to be explicitly set to null
            if (regionIdStr === null || regionIdStr.toLowerCase() === 'null' || regionIdStr === '') {
                 updateData.region_id = null;
            } else {
                const regionId = parseInt(regionIdStr);
                if (isNaN(regionId)) return NextResponse.json({ error: 'Invalid regionId format' }, { status: 400 });
                updateData.region_id = regionId;
            }
        }

        let imagePathToStore: string | null | undefined = undefined; // undefined means no change
        if (clearImage) {
            imagePathToStore = null; 
        } else if (imageFile && imageFile.size > 0) {
            imagePathToStore = imageFile.name; // Store file name
        }
        if (imagePathToStore !== undefined) {
            updateData.imagePath = imagePathToStore;
        }
        
        if (tagsJson) {
            try {
                const parsedTags = JSON.parse(tagsJson);
                if (!Array.isArray(parsedTags) || !parsedTags.every(t => typeof t === 'string')) {
                    throw new Error('Tags must be an array of strings.');
                }
                updateData.tags = parsedTags;
            } catch (e) {
                if (typeof tagsJson === 'string') {
                    updateData.tags = tagsJson.split(',').map(tag => tag.trim()).filter(Boolean);
                } else {
                     console.warn('[JSON_DB_API] Invalid tags format for update, expected JSON array or comma-separated string.');
                }
            }
        }
        // Auto-update tags if name or description changes and tags are not explicitly provided
        const existingItem = getItemByIdFromDb(itemId);
        if (!existingItem) {
            return NextResponse.json({ error: 'Item not found for auto-tag update check' }, { status: 404 });
        }
        
        const finalName = updateData.name ?? existingItem.name;
        const finalDescription = updateData.description ?? existingItem.description;
        const currentTags = new Set<string>((updateData.tags ?? existingItem.tags ?? []).map(t=>t.toLowerCase()));

        if (updateData.name || updateData.description !== undefined) { // If name or desc is changing
            if (finalName) currentTags.add(finalName.toLowerCase());
            if (finalDescription) {
                finalDescription.toLowerCase().split(/\s+/).forEach(word => {
                    const cleanWord = word.replace(/[^a-z0-9]/gi, '');
                    if (cleanWord.length > 2) currentTags.add(cleanWord);
                });
            }
            updateData.tags = Array.from(currentTags);
        }

        const updatedItem = updateItemInDb(itemId, updateData);

        if (!updatedItem) {
            return NextResponse.json({ error: 'Item not found or update failed' }, { status: 404 });
        }

        let itemLocation: Location | undefined;
        if (updatedItem.location_id) {
            itemLocation = getLocationByIdFromDb(updatedItem.location_id);
        }

        console.log(`[JSON_DB_API] Successfully updated item ID ${itemId}.`);
        return NextResponse.json(formatApiResponseItem(updatedItem, itemLocation));

    } catch (error: any) {
        console.error(`[JSON_DB_API] Error updating item ${params.id}:`, error);
        return NextResponse.json({ error: `Failed to update item: ${error.message}` }, { status: 500 });
    }
}

// DELETE /api/inventory/:id - Deletes a specific item
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const itemId = parseInt(params.id);
        if (isNaN(itemId)) {
            return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
        }

        // TODO: If images were stored, delete associated image file from disk here.
        // const itemToDelete = getItemByIdFromDb(itemId);
        // if (itemToDelete && itemToDelete.imagePath) { ... delete file ... }

        const success = deleteItemInDb(itemId);

        if (!success) {
            return NextResponse.json({ error: 'Item not found or delete failed' }, { status: 404 });
        }

        console.log(`[JSON_DB_API] Successfully deleted item ID ${itemId}.`);
        return NextResponse.json({ message: 'Item deleted successfully' });
    } catch (error: any) {
        console.error(`[JSON_DB_API] Error deleting item ${params.id}:`, error);
        return NextResponse.json({ error: `Failed to delete item: ${error.message}` }, { status: 500 });
    }
}
