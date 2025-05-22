// Updated API route to use the storage provider instead of Flask backend
import { NextRequest, NextResponse } from 'next/server';
import {
    getLocationById as getLocationByIdFromDb,
    updateLocation as updateLocationInDb,
    deleteLocation as deleteLocationInDb,
    Location, // Import type from new db lib
    LocationRegion // Import type from new db lib
} from '@lib/db';
import { saveUpload, deleteUpload } from '@/../lib/file-handler';

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
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const locationId = parseInt(resolvedParams.id);
        if (isNaN(locationId)) {
            return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
        }
        const location = getLocationByIdFromDb(locationId);
        if (location) {
            return NextResponse.json(formatApiResponseLocation(location));
        } else {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }
    } catch (error: any) {
        console.error('[JSON_DB_API] Error fetching location by ID:', error);
        return NextResponse.json({ error: `Failed to fetch location: ${error.message}` }, { status: 500 });
    }
}

// PUT /api/locations/:id - Updates a specific location
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const locationId = parseInt(resolvedParams.id);
        if (isNaN(locationId)) {
            return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
        }

        const formData = await request.formData();
        const updateData: any = { regions: [] }; // Initialize regions array
        const existingLocation = getLocationByIdFromDb(locationId);

        if (!existingLocation) {
            return NextResponse.json({ error: 'Location not found for update' }, { status: 404 });
        }

        formData.forEach((value, key) => {
            if (key === 'image') return; // Handled separately
            if (key.startsWith('regions[')) return; // Handled separately
            
            if (key === 'type') { // Assuming type is a direct string property
                updateData[key] = value as string;
            } else if (key === 'id') { // ID should not be changed from form data for the location itself
                // updateData[key] = parseInt(value as string);
            } else if (typeof value === 'string') {
                updateData[key] = value;
            }
        });

        // Handle image upload
        const imageFile = formData.get('image') as File | null;
        let newImagePath: string | null | undefined = undefined; // undefined means no change to imagePath

        if (imageFile) {
            try {
                // If there was an old image, delete it first
                if (existingLocation.imagePath) {
                    try {
                        // Pass the full imagePath (e.g., "locations/old_image.jpg") to deleteUpload
                        await deleteUpload(existingLocation.imagePath);
                    } catch (delError) {
                        console.warn(`[JSON_DB_API] Failed to delete old image ${existingLocation.imagePath}:`, delError);
                        // Non-fatal, continue with uploading new image
                    }
                }
                newImagePath = await saveUpload(imageFile, 'locations'); // Pass 'locations' category
                updateData.imagePath = newImagePath;
            } catch (uploadError: any) {
                return NextResponse.json({ error: `Image upload failed: ${uploadError.message}` }, { status: 400 });
            }
        } else if (formData.get('imagePath') === 'null') { // Check if imagePath is explicitly set to null (image removed)
            if (existingLocation.imagePath) {
                 try {
                    // Pass the full imagePath (e.g., "locations/image.jpg") to deleteUpload
                    await deleteUpload(existingLocation.imagePath);
                } catch (delError) {
                    console.warn(`[JSON_DB_API] Failed to delete old image ${existingLocation.imagePath} on removal:`, delError);
                }
            }
            updateData.imagePath = null;
        } else if (formData.has('imagePath')) {
            // If imagePath is provided in form (e.g. hidden input with existing path) and not 'null'
            updateData.imagePath = formData.get('imagePath') as string;
        } 
        // If no image changes, updateData.imagePath will remain undefined, and db update logic should not change it.

        // Process regions from FormData
        const regionEntries: { [key: string]: any } = {};
        formData.forEach((value, key) => {
            const regionMatch = key.match(/^regions\[(\d+)\]\.(.+)$/);
            if (regionMatch) {
                const index = parseInt(regionMatch[1]);
                const prop = regionMatch[2];
                if (!regionEntries[index]) regionEntries[index] = {};
                if (prop === 'x' || prop === 'y' || prop === 'width' || prop === 'height') {
                    regionEntries[index][prop] = parseFloat(value as string);
                } else {
                    regionEntries[index][prop] = value as string;
                }
            }
        });
        updateData.regions = Object.values(regionEntries).filter(r => r.name && r.x != null && r.y != null && r.width != null && r.height != null);

        const updatedLocation = updateLocationInDb(locationId, updateData);
        if (updatedLocation) {
            return NextResponse.json(formatApiResponseLocation(updatedLocation));
        } else {
            // This case should be caught by existingLocation check, but as a fallback:
            return NextResponse.json({ error: 'Location not found or update failed' }, { status: 404 });
        }
    } catch (error: any) {
        console.error('[JSON_DB_API] Error updating location:', error);
        return NextResponse.json({ error: `Failed to update location: ${error.message}` }, { status: 500 });
    }
}

// DELETE /api/locations/:id - Deletes a specific location
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const locationId = parseInt(resolvedParams.id);
        if (isNaN(locationId)) {
            return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
        }

        const existingLocation = getLocationByIdFromDb(locationId);
        if (existingLocation && existingLocation.imagePath) {
            try {
                // Pass the full imagePath (e.g., "locations/image.jpg") to deleteUpload
                await deleteUpload(existingLocation.imagePath);
            } catch (delError) {
                 console.warn(`[JSON_DB_API] Failed to delete image ${existingLocation.imagePath} during location deletion:`, delError);
            }
        }

        const success = deleteLocationInDb(locationId);
        if (success) {
            return NextResponse.json({ message: 'Location deleted successfully' });
        } else {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }
    } catch (error: any) {
        console.error('[JSON_DB_API] Error deleting location:', error);
        return NextResponse.json({ error: `Failed to delete location: ${error.message}` }, { status: 500 });
    }
}
