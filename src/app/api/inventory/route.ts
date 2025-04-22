import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { saveUpload, deleteUpload } from '@/lib/file-handler'; // Use alias
// import { saveUpload, deleteUpload } from '../../../../lib/file-handler'; // Use relative path

// Interface for the item data including joined names
interface ItemQueryResult {
    id: number;
    name: string;
    description: string | null;
    quantity: number;
    location_id: number;
    region_id: number | null;
    image_path: string | null;
    created_at: string; // Assuming TEXT/ISO8601 format
    updated_at: string; // Assuming TEXT/ISO8601 format
    location_name: string | null; // Joined from locations
    region_name: string | null;   // Joined from location_regions
}

// Helper to format item data (adjust based on actual schema)
function formatItem(item: ItemQueryResult): any { // Use the interface
    if (!item) return null;
    return {
        id: item.id,
        name: item.name,
        description: item.description,
        quantity: item.quantity, // Add quantity
        locationId: item.location_id,
        regionId: item.region_id, // Add regionId
        imagePath: item.image_path ? `/uploads/${item.image_path}` : null,
        createdAt: item.created_at,
        updatedAt: item.updated_at
    };
}

// GET /api/inventory - Fetches items, optionally filtered
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const regionId = searchParams.get('regionId');
    const queryTerm = searchParams.get('q');
    const db = getDb();

    try {
        let query = `
            SELECT i.*, l.name as location_name, r.name as region_name
            FROM items i
            LEFT JOIN locations l ON i.location_id = l.id
            LEFT JOIN location_regions r ON i.region_id = r.id
        `;
        const params: (string | number | null)[] = [];
        const conditions: string[] = [];

        if (locationId) {
            conditions.push('i.location_id = ?');
            params.push(parseInt(locationId));
        }
        if (regionId) {
            conditions.push('i.region_id = ?');
            params.push(parseInt(regionId));
        }
        if (queryTerm) {
            conditions.push('(i.name LIKE ? OR i.description LIKE ? OR l.name LIKE ? OR r.name LIKE ?)');
            params.push(`%${queryTerm}%`);
            params.push(`%${queryTerm}%`);
            params.push(`%${queryTerm}%`);
            params.push(`%${queryTerm}%`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        console.log(`Executing DB query: ${query} with params: ${params}`);
        // Cast the result array
        const items = db.prepare(query).all(...params) as ItemQueryResult[];
        console.log(`Fetched ${items.length} items.`);

        if (!Array.isArray(items)) {
             console.error("Database query did not return an array for items.");
             return NextResponse.json({ error: 'Invalid data from database' }, { status: 500 });
        }

        // Augment formatted item with location/region names if needed
        const formattedItems = items.map(item => { // item is now typed
            return {
                ...formatItem(item),
                locationName: item.location_name, // Add location name from join
                regionName: item.region_name      // Add region name from join
            };
        });

        return NextResponse.json(formattedItems);
    } catch (error) {
        console.error('Error fetching items:', error);
        return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
    }
}

// POST /api/inventory - Creates a new item
export async function POST(request: NextRequest) {
    const db = getDb();
    let savedImagePath: string | null = null;
    let newItemId: number | bigint | null = null; // Keep track of ID for potential cleanup

    try {
        const formData = await request.formData();
        console.log("Received FormData keys for new item:", Array.from(formData.keys()));

        const name = formData.get('name') as string | null;
        const description = formData.get('description') as string | null;
        const quantityStr = formData.get('quantity') as string | null;
        const locationIdStr = formData.get('locationId') as string | null;
        const regionIdStr = formData.get('regionId') as string | null;
        const imageFile = formData.get('image') as File | null;

        // --- Validation --- (moved before image upload)
        if (!name || !locationIdStr) {
            return NextResponse.json({ error: 'Missing required fields: name, locationId' }, { status: 400 });
        }
        const quantity = quantityStr ? parseInt(quantityStr) : 1;
        const locationId = parseInt(locationIdStr);
        const regionId = regionIdStr ? parseInt(regionIdStr) : null;
        if (isNaN(locationId) || (quantityStr && isNaN(quantity)) || (regionIdStr && regionId === null)) {
            return NextResponse.json({ error: 'Invalid number format for ID or quantity' }, { status: 400 });
        }
        const locationCheck = db.prepare('SELECT id FROM locations WHERE id = ?').get(locationId);
        if (!locationCheck) {
            return NextResponse.json({ error: `Location with ID ${locationId} not found` }, { status: 404 });
        }
        if (regionId !== null) {
            const regionCheck = db.prepare('SELECT id FROM location_regions WHERE id = ? AND location_id = ?').get(regionId, locationId);
            if (!regionCheck) {
                 return NextResponse.json({ error: `Region with ID ${regionId} not found or does not belong to location ${locationId}` }, { status: 404 });
            }
        }
        // --- End Validation ---

        // Handle file upload BEFORE transaction
        if (imageFile && imageFile.size > 0) {
            try {
                savedImagePath = await saveUpload(imageFile);
            } catch (uploadError) {
                console.error("Item image upload failed:", uploadError);
                return NextResponse.json({ error: 'Failed to save uploaded item image' }, { status: 500 });
            }
        }

        // --- Database Transaction --- 
        const createItemAndTagsTx = db.transaction((data) => {
            // 1. Insert Item
            const insertItemStmt = db.prepare(
                'INSERT INTO items (name, description, quantity, location_id, region_id, image_path) VALUES (?, ?, ?, ?, ?, ?)'
            );
            const info = insertItemStmt.run(
                data.name,
                data.description,
                data.quantity,
                data.locationId,
                data.regionId,
                data.savedImagePath // Use path saved before transaction
            );
            const createdItemId = info.lastInsertRowid;

            // 2. Insert Tags (using Python logic: name + description words > 3 chars)
            const insertTagStmt = db.prepare('INSERT INTO item_tags (item_id, tag) VALUES (?, ?)');
            const tags = new Set<string>();

            if (data.name) {
                 tags.add(data.name.toLowerCase());
            }
            if (data.description) {
                data.description.toLowerCase().split(/\s+/).forEach((word: any) => {
                    const cleanWord = word.replace(/[^a-z0-9]/gi, ''); // Basic alphanumeric cleaning
                    if (cleanWord.length > 3) {
                        tags.add(cleanWord);
                    }
                });
            }

            for (const tag of tags) {
                 insertTagStmt.run(createdItemId, tag);
            }
            console.log(`Inserted ${tags.size} tags for item ID ${createdItemId}`);

            return createdItemId; // Return the ID for fetching later
        });

        // Execute Transaction
        newItemId = createItemAndTagsTx({
            name,
            description,
            quantity,
            locationId,
            regionId,
            savedImagePath
        });

        console.log(`Successfully inserted item ID ${newItemId} and tags within transaction.`);
        // --- End Database Transaction ---

        // Fetch the newly created item to return
        const newItem = db.prepare(`
             SELECT i.*, l.name as location_name, r.name as region_name
             FROM items i
             LEFT JOIN locations l ON i.location_id = l.id
             LEFT JOIN location_regions r ON i.region_id = r.id
             WHERE i.id = ?
        `).get(newItemId);

        const newItemTyped = newItem as ItemQueryResult | undefined;

        if (!newItemTyped) {
             // This case is less likely if transaction succeeded, but handle anyway
             console.error(`Failed to fetch newly created item ID ${newItemId} AFTER successful transaction.`);
             // Don't delete image here as the item *was* created
             return NextResponse.json({ error: 'Failed to retrieve item after creation despite successful transaction' }, { status: 500 });
        }

        const formattedNewItem = {
             ...formatItem(newItemTyped),
             locationName: newItemTyped.location_name,
             regionName: newItemTyped.region_name
        };

        return NextResponse.json(formattedNewItem, { status: 201 });

    } catch (error: any) {
        console.error('Error during item creation process:', error);
        // Clean up uploaded file ONLY if an error occurred AFTER upload but BEFORE or DURING transaction
        if (savedImagePath && newItemId === null) { // Check if upload happened but transaction didn't return ID
            console.warn(`Error occurred after upload for ${savedImagePath}. Cleaning up...`);
            deleteUpload(savedImagePath).catch((cleanupError: any) => {
                console.error('Failed to cleanup uploaded file after error:', cleanupError);
            });
        }
        // Consider specific DB error types (e.g., UNIQUE constraints)
        return NextResponse.json({ error: `Failed to create item: ${error.message || 'Unknown error'}` }, { status: 500 });
    }
}
