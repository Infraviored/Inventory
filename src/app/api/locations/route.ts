// Updated API route to use the JSON DB
import { NextRequest, NextResponse } from 'next/server';
import {
    getAllLocations,
    getLocationById as getLocationByIdFromDb, // Renamed to avoid conflict if any local var is named getLocationById
    createLocation as createLocationInDb,
    Location, // Import type from new db lib
    LocationRegion // Import type from new db lib
} from '@lib/db';
import { saveUpload } from '@/../lib/file-handler';

// Helper to format location data for the API response
function formatApiResponseLocation(location: Location): any {
    return {
        id: location.id,
        name: location.name,
        description: location.description,
        parentId: location.parentId,
        // imagePath: location.imagePath ? `/uploads/${location.imagePath}` : null, // Keep path relative for now
        imagePath: location.imagePath, // JSON DB stores the direct path or name
        locationType: location.locationType,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
        regions: location.regions ? location.regions.map(r => ({
            id: r.id,
            name: r.name,
            x: r.x, // field names match LocationRegion type
            y: r.y,
            width: r.width,
            height: r.height,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt
        })) : []
    };
}

// GET /api/locations - Fetches locations, optionally filtered
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const parentIdStr = searchParams.get('parentId');
    const rootOnly = searchParams.get('root');

    try {
        let locations = getAllLocations();

        if (parentIdStr) {
            const parentId = parseInt(parentIdStr);
            if (!isNaN(parentId)) {
                locations = locations.filter(loc => loc.parentId === parentId);
            }
        } else if (rootOnly === 'true') {
            locations = locations.filter(loc => loc.parentId === null || loc.parentId === undefined);
        }

        console.log(`[JSON_DB_API] Fetched ${locations.length} locations based on filters.`);
        return NextResponse.json(locations.map(formatApiResponseLocation));
    } catch (error: any) {
        console.error('[JSON_DB_API] Error fetching locations:', error);
        return NextResponse.json({ error: `Failed to fetch locations: ${error.message}` }, { status: 500 });
    }
}

// POST /api/locations - Creates a new location and optionally its regions
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        console.log("[JSON_DB_API] Received FormData keys for new location:", Array.from(formData.keys()));

        const name = formData.get('name') as string | null;
        const description = formData.get('description') as string | null;
        const parentIdStr = formData.get('parentId') as string | null;
        const locationType = formData.get('locationType') as string | null;
        const regionsJson = formData.get('regions') as string | null;
        const imageFile = formData.get('image') as File | null;

        if (!name) {
            return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
        }

        const parentId = parentIdStr ? parseInt(parentIdStr) : null;
        if (parentIdStr && (isNaN(parentId as number) || parentId === null)) { 
             return NextResponse.json({ error: 'Invalid number format for parentId' }, { status: 400 });
        }

        // Validate parentId exists if provided
        if (parentId !== null) {
            const parentCheck = getLocationByIdFromDb(parentId);
            if (!parentCheck) {
                 return NextResponse.json({ error: `Parent location with ID ${parentId} not found` }, { status: 404 });
            }
        }

        let regionsToCreate: Omit<LocationRegion, 'id' | 'location_id' | 'createdAt' | 'updatedAt'>[] = [];
        if (regionsJson) {
            try {
                const parsedRegions = JSON.parse(regionsJson);
                if (!Array.isArray(parsedRegions)) {
                     throw new Error('Regions data must be an array.');
                }
                for (const region of parsedRegions) {
                     if (region.name == null || region.x == null || region.y == null || region.width == null || region.height == null) {
                          throw new Error('Each region object must contain name, x, y, width, height.');
                     }
                     regionsToCreate.push({
                        name: region.name,
                        x: parseFloat(region.x),
                        y: parseFloat(region.y),
                        width: parseFloat(region.width),
                        height: parseFloat(region.height)
                     });
                }
            } catch (e: any) {
                console.error("[JSON_DB_API] Failed to parse or validate regions JSON:", e);
                 return NextResponse.json({ error: `Invalid regions data: ${e.message}` }, { status: 400 });
            }
        }

        let imagePathToStore: string | null = null;
        if (imageFile && imageFile.size > 0) {
            // Simplified image handling: just store the name. Real upload would go here.
            // imagePathToStore = imageFile.name; 
            // console.log(`[JSON_DB_API] Storing image name: ${imagePathToStore}`);
            // In a real scenario, you'd call a saveUpload function here that works with your chosen storage.
            // For now, we are not saving the actual file to disk via this API route.
            try {
                imagePathToStore = await saveUpload(imageFile, 'locations');
                console.log(`[JSON_DB_API] Image saved, path to store: ${imagePathToStore}`);
            } catch (uploadError: any) {
                console.error("[JSON_DB_API] Error saving uploaded image:", uploadError);
                return NextResponse.json({ error: `Failed to save image: ${uploadError.message}` }, { status: 500 });
            }
        }
        
        const newLocationData: Omit<Location, 'id' | 'createdAt' | 'updatedAt' | 'regions'> & { regions?: Omit<LocationRegion, 'id' | 'location_id' | 'createdAt' | 'updatedAt'>[] } = {
            name: name,
            parentId: parentId,
            description: description || null,
            imagePath: imagePathToStore,
            locationType: locationType || null,
            regions: regionsToCreate.length > 0 ? regionsToCreate : undefined
        };

        const createdLocation = createLocationInDb(newLocationData);

        if (!createdLocation) {
            // This case should ideally be handled by createLocationInDb throwing an error
            console.error('[JSON_DB_API] Location creation returned undefined/null unexpectedly.');
            return NextResponse.json({ error: 'Failed to create location due to an internal error.' }, { status: 500 });
        }
        
        console.log(`[JSON_DB_API] Successfully created location ID ${createdLocation.id} with ${createdLocation.regions?.length || 0} regions.`);

        return NextResponse.json(formatApiResponseLocation(createdLocation), { status: 201 });

    } catch (error: any) {
        console.error('[JSON_DB_API] Error during location creation process:', error);
        // Note: No uploaded file to clean up in this simplified version if creation fails after image name is stored.
        // If actual file saving were implemented, cleanup logic (like deleteUpload) would be needed here.
        return NextResponse.json({ error: `Failed to create location: ${error.message || 'Unknown error'}` }, { status: 500 });
    }
}
