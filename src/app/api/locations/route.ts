// Updated API route to use the storage provider instead of Flask backend
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@lib/db';
import { saveUpload, deleteUpload } from '@lib/file-handler'; // Use @lib alias
// import type { Location } from '@/lib/types'; // Removed for now

// Helper to format location data (similar to Python version)
// Adapt this based on your actual Location type definition
function formatLocation(location: any): any { // Changed return type to any for now
    return {
        id: location.id,
        name: location.name,
        description: location.description,
        parentId: location.parent_id,
        imagePath: location.image_path ? `/uploads/${location.image_path}` : null,
        locationType: location.location_type,
        createdAt: location.created_at, // Ensure dates are formatted as needed by frontend
        updatedAt: location.updated_at
        // Add other fields like 'regions' if needed after fetching separately
    };
}

// GET /api/locations - Fetches locations, optionally filtered
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const rootOnly = searchParams.get('root');
    const db = getDb();

    try {
        let query = 'SELECT * FROM locations';
        const params: (string | number | null)[] = [];

        if (parentId) {
            query += ' WHERE parent_id = ?';
            params.push(parseInt(parentId));
        } else if (rootOnly === 'true') {
            query += ' WHERE parent_id IS NULL';
        }

        console.log(`Executing DB query: ${query} with params: ${params}`);
        const locations = db.prepare(query).all(...params);
        console.log(`Fetched ${locations.length} locations.`);

        // Ensure locations is an array before mapping
        if (!Array.isArray(locations)) {
             console.error("Database query did not return an array for locations.");
             return NextResponse.json({ error: 'Invalid data from database' }, { status: 500 });
        }

        return NextResponse.json(locations.map(formatLocation));
    } catch (error) {
        console.error('Error fetching locations:', error);
        return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
    }
    // Note: db connection managed by better-sqlite3 singleton
}

// POST /api/locations - Creates a new location and optionally its regions
export async function POST(request: NextRequest) {
    const db = getDb();
    let savedImagePath: string | null = null;
    let newLocationId: number | bigint | null = null; // Track ID for cleanup

    try {
        const formData = await request.formData();
        console.log("Received FormData keys:", Array.from(formData.keys()));

        const name = formData.get('name') as string | null;
        const description = formData.get('description') as string | null;
        const parentIdStr = formData.get('parentId') as string | null;
        const locationType = formData.get('locationType') as string | null;
        const regionsJson = formData.get('regions') as string | null;
        const imageFile = formData.get('image') as File | null;

        // --- Validation (before image upload/transaction) ---
        if (!name) {
            return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
        }
        const parentId = parentIdStr ? parseInt(parentIdStr) : null;
        if (parentIdStr && isNaN(parentId as number)) { // Check if parentIdStr exists but parsing failed
             return NextResponse.json({ error: 'Invalid number format for parentId' }, { status: 400 });
        }
        // Validate parentId exists if provided
        if (parentId !== null) {
            const parentCheck = db.prepare('SELECT id FROM locations WHERE id = ?').get(parentId);
            if (!parentCheck) {
                 return NextResponse.json({ error: `Parent location with ID ${parentId} not found` }, { status: 404 });
            }
        }

        let regionsData: any[] = [];
        if (regionsJson) {
            try {
                regionsData = JSON.parse(regionsJson);
                if (!Array.isArray(regionsData)) {
                     throw new Error('Regions data must be an array.');
                }
                // Basic validation of region structure within the array
                for (const region of regionsData) {
                     if (region.name == null || region.x == null || region.y == null || region.width == null || region.height == null) {
                          throw new Error('Each region object must contain name, x, y, width, height.');
                     }
                     // Could add type checks for coordinates/dimensions here
                }
            } catch (e: any) {
                console.error("Failed to parse or validate regions JSON:", e);
                 return NextResponse.json({ error: `Invalid regions data: ${e.message}` }, { status: 400 });
            }
        }
        // --- End Validation ---

        // Handle file upload BEFORE transaction
        if (imageFile && imageFile.size > 0) {
            try {
                savedImagePath = await saveUpload(imageFile);
            } catch (uploadError) {
                console.error("Location image upload failed:", uploadError);
                return NextResponse.json({ error: 'Failed to save uploaded location image' }, { status: 500 });
            }
        }

        // --- Database Transaction --- 
        const createLocationAndRegionsTx = db.transaction((data) => {
            // 1. Insert Location
            const insertLocationStmt = db.prepare(
                 'INSERT INTO locations (name, parent_id, description, image_path, location_type) VALUES (?, ?, ?, ?, ?)'
            );
            const info = insertLocationStmt.run(
                 data.name,
                 data.parentId,
                 data.description,
                 data.savedImagePath,
                 data.locationType
            );
            const locationId = info.lastInsertRowid;

            // 2. Insert Regions if provided
            if (data.regionsData.length > 0) {
                 console.log(`Inserting ${data.regionsData.length} regions for location ID ${locationId}`);
                 const insertRegionStmt = db.prepare(
                      'INSERT INTO location_regions (location_id, name, x_coord, y_coord, width, height) VALUES (?, ?, ?, ?, ?, ?)'
                 );
                 for (const region of data.regionsData) {
                      // Validation already happened outside transaction
                      insertRegionStmt.run(
                           locationId,
                           region.name,
                           region.x,
                           region.y,
                           region.width,
                           region.height
                      );
                 }
            }

            return locationId; // Return the new location ID
        });

        // Execute Transaction
        newLocationId = createLocationAndRegionsTx({
            name,
            parentId,
            description,
            savedImagePath,
            locationType,
            regionsData // Pass validated regions data into transaction
        });

        console.log(`Successfully inserted location ID ${newLocationId} and ${regionsData.length} regions within transaction.`);
        // --- End Database Transaction ---

        // Fetch the newly created location and its regions to return
        const newLocation = db.prepare('SELECT * FROM locations WHERE id = ?').get(newLocationId);
        const newRegions = db.prepare('SELECT * FROM location_regions WHERE location_id = ?').all(newLocationId);

        if (!newLocation) {
            console.error(`Failed to fetch newly created location ID ${newLocationId} AFTER successful transaction.`);
            return NextResponse.json({ error: 'Failed to retrieve location after creation despite successful transaction' }, { status: 500 });
        }

        const formatted: any = formatLocation(newLocation);
        // Format and add regions to the response
        formatted.regions = newRegions.map((r: any) => ({
            id: r.id,
            name: r.name,
            x: r.x_coord,
            y: r.y_coord,
            width: r.width,
            height: r.height,
            createdAt: r.created_at, // Include timestamps if needed
            updatedAt: r.updated_at
        }));

        return NextResponse.json(formatted, { status: 201 });

    } catch (error: any) {
        console.error('Error during location creation process:', error);
        // Clean up uploaded file ONLY if an error occurred AFTER upload but BEFORE or DURING transaction
        if (savedImagePath && newLocationId === null) {
            console.warn(`Error occurred after upload for ${savedImagePath}. Cleaning up...`);
            deleteUpload(savedImagePath).catch((cleanupError: any) => {
                console.error('Failed to cleanup uploaded file after error:', cleanupError);
            });
        }
        return NextResponse.json({ error: `Failed to create location: ${error.message || 'Unknown error'}` }, { status: 500 });
    }
}
