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
    const locationId = parseInt(params.id);
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
    let newImageUploaded = false;

    if (isNaN(locationId)) {
        return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
    }

    try {
        const formData = await request.formData();
        console.log(`[PUT /locations/${locationId}] Received FormData keys:`, Array.from(formData.keys()));

        // Extract standard fields
        const name = formData.get('name') as string | null;
        const description = formData.get('description') as string | null;
        const parentIdStr = formData.get('parentId') as string | null;
        const locationType = formData.get('locationType') as string | null;
        const imageFile = formData.get('image') as File | null;
        const clearImage = formData.get('clearImage') === 'true';

        // Extract and parse regions
        const regionsStr = formData.get('regions') as string | null;
        let regionsToUpdate: Array<{name: string, x: number, y: number, width: number, height: number}> | null = null;
        if (regionsStr) {
            try {
                regionsToUpdate = JSON.parse(regionsStr);
                if (!Array.isArray(regionsToUpdate)) {
                    console.warn(`[PUT /locations/${locationId}] Parsed regions data is not an array:`, regionsToUpdate);
                    regionsToUpdate = null; // Treat as invalid
                } else {
                     console.log(`[PUT /locations/${locationId}] Parsed ${regionsToUpdate.length} regions from form data.`);
                }
            } catch (e) {
                console.error(`[PUT /locations/${locationId}] Failed to parse regions JSON:`, e);
                return NextResponse.json({ error: 'Invalid format for regions data' }, { status: 400 });
            }
        }

        if (!name) {
            return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
        }

        const parentId = parentIdStr ? parseInt(parentIdStr) : null;

        // Start transaction
        const updateTx = db.transaction((data) => { // Pass data object
            // 1. Get current location image path
            const currentLocation = db.prepare('SELECT image_path FROM locations WHERE id = ?').get(data.locationId) as { image_path: string | null } | undefined;
            if (!currentLocation) {
                throw new Error('LocationNotFound');
            }
            oldImagePath = currentLocation.image_path;
            savedImagePath = oldImagePath;
            let imagePathToUpdate: string | null = oldImagePath;

            // 2. Handle image upload/clearing
            if (data.clearImage) {
                 console.log(`[PUT /locations/${data.locationId}] Clearing image.`);
                 imagePathToUpdate = null;
                 newImageUploaded = true;
            } else if (data.imageFile && data.imageFile.size > 0) {
                console.log(`[PUT /locations/${data.locationId}] New image file found.`);
                newImageUploaded = true;
                // Image saving will happen AFTER transaction if needed
                imagePathToUpdate = "TEMP_NEEDS_UPLOAD"; 
            } else {
                 console.log(`[PUT /locations/${data.locationId}] No new image or clear flag.`);
            }

            // 3. Update location record (use old image path if new one is pending)
            const updateLocationStmt = db.prepare(
                'UPDATE locations SET name = ?, parent_id = ?, description = ?, image_path = ?, location_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
            );
            const info = updateLocationStmt.run(
                data.name,
                data.parentId,
                data.description,
                imagePathToUpdate === "TEMP_NEEDS_UPLOAD" ? oldImagePath : imagePathToUpdate, // Use old path for now
                data.locationType,
                data.locationId
            );
            if (info.changes === 0) {
                 throw new Error('LocationNotFoundDuringUpdate');
            }

            // --- ADDED: Update Regions --- 
            if (data.regionsData !== null) { // Only update regions if data was provided
                const deleteRegionsStmt = db.prepare('DELETE FROM location_regions WHERE location_id = ?');
                const insertRegionStmt = db.prepare('INSERT INTO location_regions (location_id, name, x_coord, y_coord, width, height) VALUES (?, ?, ?, ?, ?, ?)');
                
                // Delete existing regions first
                const deleteInfo = deleteRegionsStmt.run(data.locationId);
                console.log(`[PUT /locations/${data.locationId}] Deleted ${deleteInfo.changes} existing regions.`);
                
                // Insert new regions
                let insertedCount = 0;
                for (const region of data.regionsData) {
                    // Add validation for region data if needed
                    insertRegionStmt.run(data.locationId, region.name, region.x, region.y, region.width, region.height);
                    insertedCount++;
                }
                console.log(`[PUT /locations/${data.locationId}] Inserted ${insertedCount} new regions.`);
            }
            // --- END: Update Regions --- 

            // Return necessary info for post-transaction steps
            return {
                 changes: info.changes,
                 shouldUpload: imagePathToUpdate === "TEMP_NEEDS_UPLOAD",
                 imagePathToUpdate: savedImagePath // Keep track of potential new path
            };
        });
        
        // Prepare data for transaction
        const txData = {
            locationId,
            name,
            parentId,
            description,
            locationType,
            clearImage,
            imageFile,
            regionsData: regionsToUpdate // Pass parsed regions to transaction
        };

        // Execute transaction
        const txResult = updateTx(txData);

        // Handle image upload *after* successful transaction if needed
        let finalImagePath = oldImagePath;
        if (txResult.shouldUpload && imageFile) {
             try {
                  const uploadedPath = await saveUpload(imageFile);
                  finalImagePath = uploadedPath as any;
                  // Update the DB again with the actual path
                  db.prepare('UPDATE locations SET image_path = ? WHERE id = ?').run(finalImagePath, locationId);
                  console.log(`[PUT /locations/${locationId}] DB updated with final image path: ${finalImagePath}`);
             } catch (uploadError: any) {
                  console.error(`[PUT /locations/${locationId}] Post-transaction image upload failed:`, uploadError);
                  // Transaction succeeded, but upload failed. Item state might be inconsistent.
                  return NextResponse.json({ error: 'Database updated, but image upload failed' }, { status: 500 });
             }
        } else if (clearImage) {
            // Image path was already set to null in the transaction
            finalImagePath = null;
        } else {
             // No upload, no clear, keep old path
             finalImagePath = oldImagePath;
        }

        // Handle old image deletion *after* successful transaction and potential new upload
        if (newImageUploaded && oldImagePath && oldImagePath !== finalImagePath) {
             deleteUpload(oldImagePath)
                .then(() => console.log(`[PUT /locations/${locationId}] Old image ${oldImagePath} deleted successfully.`))
                .catch((err: any) => console.error(`[PUT /locations/${locationId}] Failed to delete old image ${oldImagePath}:`, err));
        }
        
        // Fetch and return updated location (including image path)
        const updatedLocationResult = db.prepare('SELECT * FROM locations WHERE id = ?').get(locationId);
        return NextResponse.json(formatLocation(updatedLocationResult)); // Use existing format helper

    } catch (error: any) {
        console.error(`[PUT /locations/${locationId}] Error updating location:`, error);

        // Handle specific transaction errors
        if (error.message === 'LocationNotFound' || error.message === 'LocationNotFoundDuringUpdate') {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }

        // Clean up newly uploaded file if the main transaction failed *before* upload attempt
        // If upload happened post-transaction and failed, it's handled above.
        // This cleanup logic might need adjustment if saveUpload happens post-transaction

        return NextResponse.json({ error: `Failed to update location: ${error.message || 'Unknown error'}` }, { status: 500 });
    }
}

// DELETE /api/locations/:id - Deletes a specific location
// Modify signature to only accept request, parse ID from URL
export async function DELETE(request: NextRequest) {
    // Extract ID from pathname: e.g., /api/locations/123 -> 123
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split('/');
    const id = segments[segments.length - 1]; // Get the last segment
    
    console.log(`[DELETE] Parsed ID from pathname (${pathname}): ${id}`);

    // const { id } = params; // REMOVED - Use ID parsed from URL
    const locationId = parseInt(id);
    const db = getDb();

    if (isNaN(locationId)) {
        // Return error if ID parsing failed
        return NextResponse.json({ error: 'Invalid location ID format in URL' }, { status: 400 });
    }

    try {
         // Use transaction for consistency
        const deleteTx = db.transaction(() => {
            // 1. Get current location
            const location: { image_path: string | null } | undefined = db.prepare(
                 'SELECT image_path FROM locations WHERE id = ?'
                 ).get(locationId) as { image_path: string | null } | undefined; // Use parsed locationId
            
             if (!location) {
                return { success: false, status: 404, error: 'Location not found' };
            }
            const imagePathToDelete = location.image_path; // Now safe to access

            // 2. Delete from database
            const info = db.prepare('DELETE FROM locations WHERE id = ?').run(locationId); // Use parsed locationId

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
