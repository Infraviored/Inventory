// Updated API route to use the storage provider instead of Flask backend
import { NextRequest, NextResponse } from 'next/server';
import {
    getLocationById as getLocationByIdFromDb,
    updateLocation as updateLocationInDb,
    deleteLocation as deleteLocationInDb,
    Location, // Import type from new db lib
    LocationRegion // Import type from new db lib
} from '@lib/db';
import { saveUpload, deleteUpload } from '@lib/file-handler';

// Force dynamic rendering/evaluation for this route
export const dynamic = 'force-dynamic';

// Helper to format location data for the API response
function formatApiResponseLocation(location: Location): any {
    return {
        id: location.id,
        name: location.name,
        description: location.description,
        parentId: location.parentId,
        imagePath: location.imagePath, // JSON DB stores the direct path or name
        locationType: location.locationType,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
        regions: location.regions ? location.regions.map(r => ({
            id: r.id,
            name: r.name,
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt
        })) : []
    };
}

// GET /api/locations/:id - Fetches a specific location
export async function GET(request: NextRequest, context: { params: { id: string } }) {
    try {
        const locationId = parseInt(context.params.id);
        if (isNaN(locationId)) {
            return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
        }

        const location = getLocationByIdFromDb(locationId);

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }
        console.log(`[JSON_DB_API] Fetched location ${locationId}`);
        return NextResponse.json(formatApiResponseLocation(location));
    } catch (error: any) {
        console.error(`[JSON_DB_API] Error fetching location by ID:`, error);
        return NextResponse.json({ error: `Failed to fetch location: ${error.message}` }, { status: 500 });
    }
}

// PUT /api/locations/:id - Updates a specific location
export async function PUT(request: NextRequest, context: { params: { id: string } }) {
    let locationId: number | undefined = undefined;
    try {
        locationId = parseInt(context.params.id);
        if (isNaN(locationId)) {
            return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
        }

        const existingLocation = getLocationByIdFromDb(locationId);
        if (!existingLocation) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }

        const formData = await request.formData();
        console.log(`[JSON_DB_API] PUT /locations/${locationId} FormData keys:`, Array.from(formData.keys()));

        const name = formData.get('name') as string | null;
        const description = formData.get('description') as string | null;
        const parentIdStr = formData.get('parentId') as string | null;
        const locationType = formData.get('locationType') as string | null;
        const imageFile = formData.get('image') as File | null;
        const clearImage = formData.get('clearImage') === 'true';
        const regionsJson = formData.get('regions') as string | null;

        if (!name) {
            // For PUT, name is not strictly required if other fields are being updated.
            // However, our current updateLocationInDb might require it or handle partial updates.
            // For now, let's assume some fields can be updated without name, but the DB function must support it.
        }

        const parentId = parentIdStr ? parseInt(parentIdStr) : null;
        if (parentIdStr && (isNaN(parentId as number) || parentId === null) && parentIdStr !== 'null' && parentIdStr !== '') { 
            return NextResponse.json({ error: 'Invalid number format for parentId' }, { status: 400 });
        }
        
        const updateData: Partial<Omit<Location, 'id' | 'createdAt' | 'updatedAt' | 'regions'>> & { regions?: (Omit<LocationRegion, 'id' | 'location_id' | 'createdAt' | 'updatedAt'> & {id?: number})[] } = {};

        if (name !== null) updateData.name = name;
        if (description !== null) updateData.description = description; // Allow setting description to empty string
        if (locationType !== null) updateData.locationType = locationType;
        if (parentIdStr === 'null' || parentIdStr === '') { // Explicitly setting parent to null
            updateData.parentId = null;
        } else if (parentId !== null) {
            updateData.parentId = parentId;
        }

        let imagePathToStore: string | null | undefined = undefined; // undefined means no change to image
        const currentImagePath = existingLocation.imagePath;

        if (clearImage) {
            if (currentImagePath) {
                try {
                    await deleteUpload(currentImagePath);
                    console.log(`[JSON_DB_API] Deleted old image ${currentImagePath} for location ${locationId}`);
                } catch (e: any) {
                    console.warn(`[JSON_DB_API] Failed to delete old image ${currentImagePath}: ${e.message}`);
                    // Non-critical, continue with update
                }
            }
            imagePathToStore = null; // Set to null to remove image
            console.log(`[JSON_DB_API] Clearing image for location ${locationId}`);
        } else if (imageFile && imageFile.size > 0) {
            if (currentImagePath) {
                try {
                    await deleteUpload(currentImagePath);
                    console.log(`[JSON_DB_API] Deleted old image ${currentImagePath} before uploading new one for location ${locationId}`);
                } catch (e: any) {
                    console.warn(`[JSON_DB_API] Failed to delete old image ${currentImagePath} before upload: ${e.message}`);
                    // Non-critical, continue with update
                }
            }
            try {
                imagePathToStore = await saveUpload(imageFile);
                console.log(`[JSON_DB_API] Storing new image path: ${imagePathToStore} for location ${locationId}`);
            } catch (uploadError: any) {
                console.error("[JSON_DB_API] Error saving uploaded image during update:", uploadError);
                return NextResponse.json({ error: `Failed to save image: ${uploadError.message}` }, { status: 500 });
            }
        }
        if (imagePathToStore !== undefined) {
            updateData.imagePath = imagePathToStore;
        }

        if (regionsJson) {
            try {
                const parsedRegions = JSON.parse(regionsJson);
                if (!Array.isArray(parsedRegions)) throw new Error('Regions data must be an array.');
                updateData.regions = parsedRegions.map((r: any) => ({
                    id: r.id ? parseInt(r.id) : undefined, // Keep existing ID if provided for update
                    name: r.name,
                    x: parseFloat(r.x),
                    y: parseFloat(r.y),
                    width: parseFloat(r.width),
                    height: parseFloat(r.height)
                }));
            } catch (e: any) {
                console.error("[JSON_DB_API] Failed to parse regions JSON for PUT:", e);
                return NextResponse.json({ error: `Invalid regions data: ${e.message}` }, { status: 400 });
            }
        }

        const updatedLocation = updateLocationInDb(locationId, updateData);

        if (!updatedLocation) {
            return NextResponse.json({ error: 'Location not found or update failed' }, { status: 404 });
        }
        
        console.log(`[JSON_DB_API] Successfully updated location ID ${locationId}.`);
        return NextResponse.json(formatApiResponseLocation(updatedLocation));

    } catch (error: any) {
        console.error(`[JSON_DB_API] Error updating location ${locationId !== undefined ? locationId : context.params.id}:`, error);
        return NextResponse.json({ error: `Failed to update location: ${error.message}` }, { status: 500 });
    }
}

// DELETE /api/locations/:id - Deletes a specific location
export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
    let locationId: number | undefined = undefined;
    try {
        locationId = parseInt(context.params.id);
        if (isNaN(locationId)) {
            return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
        }

        const locationToDelete = getLocationByIdFromDb(locationId); 
        if (locationToDelete && locationToDelete.imagePath) {
            try {
                await deleteUpload(locationToDelete.imagePath);
                console.log(`[JSON_DB_API] Deleted image ${locationToDelete.imagePath} for location ${locationId}`);
            } catch (e: any) {
                console.warn(`[JSON_DB_API] Failed to delete image ${locationToDelete.imagePath} for location ${locationId}: ${e.message}`);
                // Decide if this is a critical failure or if location deletion should proceed
            }
        }

        const success = deleteLocationInDb(locationId);

        if (!success) {
            return NextResponse.json({ error: 'Location not found or delete failed' }, { status: 404 });
        }

        console.log(`[JSON_DB_API] Successfully deleted location ID ${locationId}.`);
        return NextResponse.json({ message: 'Location deleted successfully' });
    } catch (error: any) {
        console.error(`[JSON_DB_API] Error deleting location ${locationId !== undefined ? locationId : context.params.id}:`, error);
        return NextResponse.json({ error: `Failed to delete location: ${error.message}` }, { status: 500 });
    }
}
