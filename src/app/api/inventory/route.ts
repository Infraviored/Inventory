import { NextRequest, NextResponse } from 'next/server';
import {
    getAllItems,
    createItem as createItemInDb,
    getItemById as getItemByIdFromDb, // Though not used in this file directly, good for consistency
    getLocationById as getLocationByIdFromDb, // For validation
    Item, // Import type from new db lib
    Location
} from '@lib/db';
// import { saveUpload, deleteUpload } from '@lib/file-handler'; // Temporarily remove for simplification

// Helper to format item data for API response
// The items from getAllItems will already be close to this, but this ensures consistency
// and allows for future expansion (e.g., populating locationName/regionName if needed)
function formatApiResponseItem(item: Item, allLocations?: Location[]): any {
    if (!item) return null;
    let locationName: string | null = null;
    // If allLocations are provided, try to find the location name
    if (allLocations) {
        const location = allLocations.find(loc => loc.id === item.location_id);
        if (location) {
            locationName = location.name;
        }
    }
    // Region name would require fetching regions or having them on the location object

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
        locationName: locationName, // Add locationName
        // regionName: regionName, // TODO: Add regionName if needed by fetching/joining
    };
}

// GET /api/inventory - Fetches items, optionally filtered
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const locationIdStr = searchParams.get('locationId');
    const regionIdStr = searchParams.get('regionId');
    const queryTerm = searchParams.get('q');

    try {
        const filters: { locationId?: number; regionId?: number; queryTerm?: string } = {};
        if (locationIdStr) {
            const parsed = parseInt(locationIdStr);
            if (!isNaN(parsed)) filters.locationId = parsed;
        }
        if (regionIdStr) {
            const parsed = parseInt(regionIdStr);
            if (!isNaN(parsed)) filters.regionId = parsed;
        }
        if (queryTerm) {
            filters.queryTerm = queryTerm;
        }

        const items = getAllItems(filters);
        // For now, to add locationName, we fetch all locations. This could be optimized.
        const locations = getAllItems().length > 0 ? getLocationByIdFromDb(items[0].location_id) : []; // simplified for now
        // A better approach would be to fetch all locations once: const allLocations = getAllLocations();
        // Then pass allLocations to formatApiResponseItem.
        // Or, modify getAllItems to optionally join/include location names.

        console.log(`[JSON_DB_API] Fetched ${items.length} items.`);
        return NextResponse.json(items.map(item => formatApiResponseItem(item, locations && Array.isArray(locations) ? locations: undefined))); // Pass locations for name resolution
    } catch (error: any) {
        console.error('[JSON_DB_API] Error fetching items:', error);
        return NextResponse.json({ error: `Failed to fetch items: ${error.message}` }, { status: 500 });
    }
}

// POST /api/inventory - Creates a new item
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        console.log("[JSON_DB_API] Received FormData keys for new item:", Array.from(formData.keys()));

        const name = formData.get('name') as string | null;
        const description = formData.get('description') as string | null;
        const quantityStr = formData.get('quantity') as string | null;
        const locationIdStr = formData.get('locationId') as string | null;
        const regionIdStr = formData.get('regionId') as string | null;
        const imageFile = formData.get('image') as File | null;
        // Tags might come as a JSON string or comma-separated, adjust as needed
        const tagsJson = formData.get('tags') as string | null; 

        if (!name || !locationIdStr) {
            return NextResponse.json({ error: 'Missing required fields: name, locationId' }, { status: 400 });
        }

        const quantity = quantityStr ? parseInt(quantityStr) : 1;
        const locationId = parseInt(locationIdStr);
        const regionId = regionIdStr ? parseInt(regionIdStr) : null;

        if (isNaN(locationId) || (quantityStr && isNaN(quantity)) || 
            (regionIdStr && regionId === null && regionIdStr !== '' && regionIdStr !== 'null')) {
             return NextResponse.json({ error: 'Invalid number format for ID or quantity' }, { status: 400 });
        }

        // Validate location exists
        const locationCheck = getLocationByIdFromDb(locationId);
        if (!locationCheck) {
            return NextResponse.json({ error: `Location with ID ${locationId} not found` }, { status: 404 });
        }
        // Validate region exists and belongs to location (if provided)
        if (regionId !== null) {
            const regionCheck = locationCheck.regions?.find(r => r.id === regionId);
            if (!regionCheck) {
                 return NextResponse.json({ error: `Region with ID ${regionId} not found or does not belong to location ${locationId}` }, { status: 404 });
            }
        }

        let imagePathToStore: string | null = null;
        if (imageFile && imageFile.size > 0) {
            imagePathToStore = imageFile.name; // Simplified: store name
            console.log(`[JSON_DB_API] Storing item image name: ${imagePathToStore}`);
        }

        let tagsToStore: string[] = [];
        if (tagsJson) {
            try {
                tagsToStore = JSON.parse(tagsJson);
                if (!Array.isArray(tagsToStore) || !tagsToStore.every(t => typeof t === 'string')) {
                    throw new Error('Tags must be an array of strings.');
                }
            } catch (e) {
                // Fallback for comma-separated tags if JSON parsing fails or it's a simple string
                if (typeof tagsJson === 'string') {
                    tagsToStore = tagsJson.split(',').map(tag => tag.trim()).filter(Boolean);
                } else {
                    console.warn('[JSON_DB_API] Invalid tags format, expected JSON array or comma-separated string.');
                    tagsToStore = []; // Default to empty if parsing fails badly
                }
            }
        }
         // Automatically add name and words from description as tags
        const autoTags = new Set<string>(tagsToStore.map(t=>t.toLowerCase()));
        if (name) {
            autoTags.add(name.toLowerCase());
        }
        if (description) {
            description.toLowerCase().split(/\s+/).forEach(word => {
                const cleanWord = word.replace(/[^a-z0-9]/gi, '');
                if (cleanWord.length > 2) autoTags.add(cleanWord); // Min length for auto tags
            });
        }
        tagsToStore = Array.from(autoTags);


        const newItemData: Omit<Item, 'id' | 'createdAt' | 'updatedAt'> = {
            name: name,
            description: description || null,
            quantity: quantity,
            location_id: locationId,
            region_id: regionId,
            imagePath: imagePathToStore,
            tags: tagsToStore
        };

        const createdItem = createItemInDb(newItemData);

        if (!createdItem) {
            console.error('[JSON_DB_API] Item creation returned undefined/null unexpectedly.');
            return NextResponse.json({ error: 'Failed to create item due to an internal error.' }, { status: 500 });
        }
        
        console.log(`[JSON_DB_API] Successfully created item ID ${createdItem.id}.`);
        const allLocations = [locationCheck]; // Pass the fetched location for name resolution
        return NextResponse.json(formatApiResponseItem(createdItem, allLocations), { status: 201 });

    } catch (error: any) {
        console.error('[JSON_DB_API] Error during item creation process:', error);
        return NextResponse.json({ error: `Failed to create item: ${error.message || 'Unknown error'}` }, { status: 500 });
    }
}
