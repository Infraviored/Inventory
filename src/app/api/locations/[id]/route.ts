// Updated API route to use the storage provider instead of Flask backend
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@lib/db';
import { saveUpload, deleteUpload } from '@lib/file-handler';
import Database from 'better-sqlite3'; // Import Database for SqliteError check
// import type { Location } from '@/lib/types'; // Define later if needed

// Force dynamic rendering/evaluation for this route
export const dynamic = 'force-dynamic';

// Helper to format location data (consistent with locations/route.ts)
function formatLocation(location: any): any {
    if (!location) return null;
    return {
        id: location.id,
        name: location.name,
        description: location.description,
        parentId: location.parent_id,
        imagePath: location.image_path ? `/uploads/${location.image_path}` : null,
        locationType: location.location_type,
        createdAt: location.created_at,
        updatedAt: location.updated_at
    };
}

// GET /api/locations/:id - Fetches a specific location
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params;
    const locationId = parseInt(id);
    const db = getDb();

    if (isNaN(locationId)) {
        return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
    }

    try {
        const stmt = db.prepare('SELECT * FROM locations WHERE id = ?');
        const location = stmt.get(locationId);

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }

        return NextResponse.json(formatLocation(location));
    } catch (error) {
        console.error(`Error fetching location ${locationId}:`, error);
        return NextResponse.json({ error: 'Failed to fetch location' }, { status: 500 });
    }
}

// PUT /api/locations/:id - Updates a specific location
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params;
    const locationId = parseInt(id);
    const db = getDb();
    let savedImagePath: string | null = null;
    let oldImagePath: string | null = null;
    let newImageUploaded = false; // Flag to track if a new file was processed

    if (isNaN(locationId)) {
        return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
    }

    try {
        const formData = await request.formData();
        console.log(`[PUT /locations/${locationId}] Received FormData keys:`, Array.from(formData.keys()));

        const name = formData.get('name') as string | null;
        const description = formData.get('description') as string | null;
        const parentIdStr = formData.get('parentId') as string | null;
        const locationType = formData.get('locationType') as string | null;
        const imageFile = formData.get('image') as File | null;
        // Note: We might get 'null' as a string if checkbox/clearing logic sends it
        const clearImage = formData.get('clearImage') === 'true'; 

        if (!name) {
            return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
        }

        const parentId = parentIdStr ? parseInt(parentIdStr) : null;

        // Start transaction
        const updateTx = db.transaction(async (data) => {
            // 1. Get current location
            const currentLocation: { image_path: string | null } | undefined = db.prepare(
                'SELECT image_path FROM locations WHERE id = ?'
            ).get(data.locationId) as { image_path: string | null } | undefined;
            
            if (!currentLocation) {
                throw new Error('LocationNotFound');
            }
            oldImagePath = currentLocation.image_path; // Now safe to access
            savedImagePath = oldImagePath;

            let imagePathToUpdate: string | null = oldImagePath;

            // 2. Handle image upload/clearing
            if (clearImage) {
                 console.log(`[PUT /locations/${data.locationId}] Clearing image.`);
                 imagePathToUpdate = null;
                 newImageUploaded = true; // Mark as processed to trigger old image deletion
            } else if (imageFile && imageFile.size > 0) {
                console.log(`[PUT /locations/${data.locationId}] New image file found.`);
                newImageUploaded = true;
                try {
                    savedImagePath = await saveUpload(imageFile);
                    imagePathToUpdate = savedImagePath; // Update DB with the new path
                    console.log(`[PUT /locations/${data.locationId}] New image saved: ${savedImagePath}`);
                } catch (uploadError) {
                    console.error(`[PUT /locations/${data.locationId}] File upload failed:`, uploadError);
                    // Re-throw to abort transaction
                    throw new Error(`Failed to save uploaded image: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
                }
            } else {
                 console.log(`[PUT /locations/${data.locationId}] No new image or clear flag.`);
            }

            // 3. Update database record
            const stmt = db.prepare(
                'UPDATE locations SET name = ?, parent_id = ?, description = ?, image_path = ?, location_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
            );
            const info = stmt.run(
                data.name,
                data.parentId,
                data.description,
                imagePathToUpdate,
                data.locationType,
                data.locationId
            );

            if (info.changes === 0) {
                 throw new Error('LocationNotFoundDuringUpdate');
            }
            
            // 4. Delete old image AFTER DB update succeeds and if conditions met
            if (newImageUploaded && oldImagePath && oldImagePath !== savedImagePath) {
                 deleteUpload(oldImagePath)
                    .then(() => console.log(`[PUT /locations/${data.locationId}] Old image ${oldImagePath} deleted successfully.`))
                    .catch((err: any) => console.error(`[PUT /locations/${data.locationId}] Failed to delete old image ${oldImagePath}:`, err)); // Added type for err
            }
            
            return info.changes > 0;
        });
        
        // Execute transaction
        const success = updateTx({ locationId, name, parentId, description, locationType });

        if (!success) {
             return NextResponse.json({ error: 'Location not found or update failed' }, { status: 404 });
        }

        // Fetch and return updated location
        const updatedLocation = db.prepare('SELECT * FROM locations WHERE id = ?').get(locationId);
        return NextResponse.json(formatLocation(updatedLocation));

    } catch (error: any) {
        console.error(`[PUT /locations/${locationId}] Error updating location:`, error);

        // Handle specific transaction errors
        if (error.message === 'LocationNotFound') {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }
        if (error.message === 'LocationNotFoundDuringUpdate') {
             return NextResponse.json({ error: 'Location not found during update' }, { status: 404 });
        }

        // Clean up newly uploaded file if the transaction failed
        if (newImageUploaded && savedImagePath && savedImagePath !== oldImagePath) {
            console.warn(`[PUT /locations/${locationId}] Transaction failed after new image upload. Cleaning up ${savedImagePath}...`);
            deleteUpload(savedImagePath).catch((err: any) => console.error('Failed cleanup delete', err)); // Added type for err
        }

        return NextResponse.json({ error: `Failed to update location: ${error.message || 'Unknown error'}` }, { status: 500 });
    }
}

// DELETE /api/locations/:id - Deletes a specific location
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    // Read request object to mark route as dynamic (workaround for params error)
    const url = request.url;
    console.log(`[DELETE] Request URL: ${url}`); // Optional: log for confirmation
    
    const { id } = params;
    const locationId = parseInt(id);
    const db = getDb();

    if (isNaN(locationId)) {
        return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
    }

    try {
         // Use transaction for consistency
        const deleteTx = db.transaction(() => {
            // 1. Get current location
            const location: { image_path: string | null } | undefined = db.prepare(
                 'SELECT image_path FROM locations WHERE id = ?'
                 ).get(locationId) as { image_path: string | null } | undefined;
            
             if (!location) {
                return { success: false, status: 404, error: 'Location not found' };
            }
            const imagePathToDelete = location.image_path; // Now safe to access

            // 2. Delete from database
            const info = db.prepare('DELETE FROM locations WHERE id = ?').run(locationId);

            if (info.changes === 0) {
                 return { success: false, status: 404, error: 'Location not found during delete' };
            }

            // 3. Return path of image to delete AFTER successful DB deletion
            return { success: true, status: 200, imagePathToDelete }; 
        });

        const result = deleteTx();

        // Handle transaction result
        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        // 4. Delete image file outside transaction (if DB delete succeeded)
        if (result.imagePathToDelete) {
            deleteUpload(result.imagePathToDelete)
                .then(() => console.log(`[DELETE /locations/${locationId}] Associated image ${result.imagePathToDelete} deleted.`))
                .catch((err: any) => console.error(`[DELETE /locations/${locationId}] Failed to delete image ${result.imagePathToDelete}:`, err)); // Added type for err
        }
        
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error(`Error deleting location ${locationId}:`, error);
        // Check specific error type
        if (error instanceof Database.SqliteError && error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
             return NextResponse.json({ error: 'Cannot delete location because it is referenced by other items.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
    }
}
