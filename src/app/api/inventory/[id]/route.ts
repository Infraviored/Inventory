import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@lib/db';
import { saveUpload, deleteUpload } from '@lib/file-handler'; // CORRECT ALIAS
// import { saveUpload, deleteUpload } from '../../../../lib/file-handler'; // Use relative path for now
import Database from 'better-sqlite3'; // Import Database for SqliteError check

// Interface for the item data including joined names (needed for fetch after update)
interface ItemQueryResult {
    id: number;
    name: string;
    description: string | null;
    quantity: number;
    location_id: number;
    region_id: number | null;
    image_path: string | null;
    created_at: string;
    updated_at: string;
    location_name: string | null; // Joined from locations
    region_name: string | null;   // Joined from location_regions
}

// Helper to format item data (consistent with inventory/route.ts)
// Takes the full query result but formats for API response
function formatItem(item: ItemQueryResult | any): any { // Allow broader input for GET simplicity
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
        updatedAt: item.updated_at,
        // Include names if available from query
        locationName: item.location_name,
        regionName: item.region_name
    };
}

// GET /api/inventory/:id - Fetches a specific item
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const itemId = parseInt(id);
    const db = getDb();

    if (isNaN(itemId)) {
        return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    try {
        // Join tables to get location/region names
        const stmt = db.prepare(`
            SELECT i.*, l.name as location_name, r.name as region_name
            FROM items i
            LEFT JOIN locations l ON i.location_id = l.id
            LEFT JOIN location_regions r ON i.region_id = r.id
            WHERE i.id = ?
        `);
        const item = stmt.get(itemId) as ItemQueryResult | undefined;

        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        return NextResponse.json(formatItem(item)); // Use updated formatter
    } catch (error) {
        console.error(`Error fetching item ${itemId}:`, error);
        return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 });
    }
}

// PUT /api/inventory/:id - Updates a specific item
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const itemId = parseInt(id);
    const db = getDb();
    let savedImagePath: string | null = null;
    let oldImagePath: string | null = null;
    let newImageUploaded = false;

    if (isNaN(itemId)) {
        return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    try {
        const formData = await request.formData();
        console.log(`[PUT /inventory/${itemId}] Received FormData keys:`, Array.from(formData.keys()));

        // Extract fields
        const name = formData.get('name') as string | null;
        const description = formData.get('description') as string | null;
        const quantityStr = formData.get('quantity') as string | null; // Get quantity
        const locationIdStr = formData.get('locationId') as string | null;
        const regionIdStr = formData.get('regionId') as string | null; // Get regionId
        const imageFile = formData.get('image') as File | null;
        const clearImage = formData.get('clearImage') === 'true';

        // Validate required fields (still need name and locationId)
        if (!name || !locationIdStr) {
            return NextResponse.json({ error: 'Missing required fields: name, locationId' }, { status: 400 });
        }

        // Parse optional fields (provide defaults or null)
        const quantity = quantityStr ? parseInt(quantityStr) : undefined; // Keep undefined if not provided
        const locationId = parseInt(locationIdStr); // Already validated as required
        const regionId = regionIdStr === "null" || regionIdStr === "" || regionIdStr === null ? null : (regionIdStr ? parseInt(regionIdStr) : undefined); // Handle explicit null/empty or parse

        // Validate parsed numbers
        if (isNaN(locationId) || (quantityStr && quantity === undefined)) {
            return NextResponse.json({ error: 'Invalid number format for location ID or quantity' }, { status: 400 });
        }
        if (regionIdStr && regionId === undefined && !(regionIdStr === "null" || regionIdStr === "")) { // Check if parsing failed for non-null regionId
             return NextResponse.json({ error: 'Invalid number format for region ID' }, { status: 400 });
        }

        // Start transaction
        const updateTx = db.transaction((data) => { // Pass data object
            // 1. Get current item data (including current quantity/region if not provided)
            const currentItem = db.prepare(
                'SELECT image_path, quantity, region_id FROM items WHERE id = ?'
            ).get(data.itemId) as { image_path: string | null, quantity: number, region_id: number | null } | undefined;

            if (!currentItem) {
                throw new Error('ItemNotFound');
            }
            oldImagePath = currentItem.image_path;
            savedImagePath = oldImagePath;
            let imagePathToUpdate: string | null = oldImagePath;

            // Determine final values, using current if not provided in request
            const finalName = data.name; // Name is required, use directly
            const finalDescription = data.description; // Use provided or null
            const finalQuantity = data.quantity !== undefined ? data.quantity : currentItem.quantity;
            const finalLocationId = data.locationId; // LocationId is required
            const finalRegionId = data.regionId !== undefined ? data.regionId : currentItem.region_id;

            // 2. Handle image upload/clearing
            if (data.clearImage) {
                console.log(`[PUT /inventory/${data.itemId}] Clearing image.`);
                imagePathToUpdate = null;
                newImageUploaded = true;
            } else if (data.imageFile && data.imageFile.size > 0) {
                console.log(`[PUT /inventory/${data.itemId}] New image file found.`);
                newImageUploaded = true;
                imagePathToUpdate = "TEMP_NEEDS_UPLOAD"; // Placeholder for post-transaction upload
            }

            // 3. Check if target location exists
            const locationCheck = db.prepare('SELECT id FROM locations WHERE id = ?').get(finalLocationId);
            if (!locationCheck) {
                 throw new Error('LocationNotFound');
            }
            // 3b. Check if target region exists (if specified)
            if (finalRegionId !== null) {
                 const regionCheck = db.prepare('SELECT id FROM location_regions WHERE id = ? AND location_id = ?').get(finalRegionId, finalLocationId);
                 if (!regionCheck) {
                      throw new Error('RegionNotFound');
                 }
            }

            // 4. Update database record
            const itemUpdateStmt = db.prepare(
                'UPDATE items SET name = ?, location_id = ?, description = ?, quantity = ?, region_id = ?, image_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
            );
            const info = itemUpdateStmt.run(
                finalName,
                finalLocationId,
                finalDescription,
                finalQuantity,
                finalRegionId,
                imagePathToUpdate === "TEMP_NEEDS_UPLOAD" ? oldImagePath : imagePathToUpdate,
                data.itemId
            );

            if (info.changes === 0) {
                 throw new Error('ItemNotFoundDuringUpdate');
            }

            // 5. Update Tags
            const deleteTagsStmt = db.prepare('DELETE FROM item_tags WHERE item_id = ?');
            const insertTagStmt = db.prepare('INSERT INTO item_tags (item_id, tag) VALUES (?, ?)');

            deleteTagsStmt.run(data.itemId);
            const tags = new Set<string>();
            if (finalName) {
                 tags.add(finalName.toLowerCase());
            }
            if (finalDescription) {
                 finalDescription.toLowerCase().split(/\s+/).forEach((word: any) => {
                      const cleanWord = word.replace(/[^a-z0-9]/gi, '');
                      if (cleanWord.length > 3) {
                          tags.add(cleanWord);
                      }
                 });
            }
            for (const tag of tags) {
                 insertTagStmt.run(data.itemId, tag);
            }
            console.log(`Updated ${tags.size} tags for item ID ${data.itemId}`);

            // Return necessary info for post-transaction steps
            return {
                 changes: info.changes,
                 shouldUpload: imagePathToUpdate === "TEMP_NEEDS_UPLOAD",
                 shouldDeleteOld: newImageUploaded && oldImagePath && oldImagePath !== imagePathToUpdate
            };
        });

        // Data to pass into the transaction
        const txData = {
             itemId,
             name,
             description,
             quantity,
             locationId,
             regionId,
             imageFile,
             clearImage
        };

        // Execute transaction
        const txResult = updateTx(txData);

        // Handle image upload *after* successful transaction if needed
        let finalImagePath = oldImagePath;
        if (txResult.shouldUpload && imageFile) {
             try {
                  const uploadedPath = await saveUpload(imageFile);
                  finalImagePath = uploadedPath as any; // Use type assertion to any
                  // Update the DB again with the actual path
                  db.prepare('UPDATE items SET image_path = ? WHERE id = ?').run(finalImagePath, itemId);
                  console.log(`[PUT /inventory/${itemId}] DB updated with final image path: ${finalImagePath}`);
             } catch (uploadError: any) {
                  console.error(`[PUT /inventory/${itemId}] Post-transaction image upload failed:`, uploadError);
                  // Transaction succeeded, but upload failed. Item state might be inconsistent.
                  // Consider how to handle this - maybe log prominently or attempt cleanup?
                  return NextResponse.json({ error: 'Database updated, but image upload failed' }, { status: 500 });
             }
        }
        // Handle clearing image (if upload didn't happen)
        else if (clearImage) {
             finalImagePath = null;
             // Update the DB (might have been set to null already if !txResult.shouldUpload)
             db.prepare('UPDATE items SET image_path = ? WHERE id = ?').run(
                 finalImagePath === null ? null : finalImagePath, // Explicitly pass null
                 itemId
             );
        }

        // Handle old image deletion *after* successful transaction and potential new upload
        if (txResult.shouldDeleteOld && oldImagePath && oldImagePath !== finalImagePath) {
             deleteUpload(oldImagePath)
                .then(() => console.log(`[PUT /inventory/${itemId}] Old image ${oldImagePath} deleted successfully.`))
                .catch((err: any) => console.error(`[PUT /inventory/${itemId}] Failed to delete old image ${oldImagePath}:`, err));
        }

        // Fetch and return updated item (including joined names)
        const updatedItemResult = db.prepare(`
             SELECT i.*, l.name as location_name, r.name as region_name
             FROM items i
             LEFT JOIN locations l ON i.location_id = l.id
             LEFT JOIN location_regions r ON i.region_id = r.id
             WHERE i.id = ?
        `).get(itemId);

        return NextResponse.json(formatItem(updatedItemResult as ItemQueryResult)); // Cast and format

    } catch (error: any) {
        console.error(`[PUT /inventory/${itemId}] Error updating item:`, error);

        // Handle specific transaction errors
        if (error.message === 'ItemNotFound' || error.message === 'ItemNotFoundDuringUpdate') {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }
        if (error.message === 'LocationNotFound') {
            return NextResponse.json({ error: 'Target location not found' }, { status: 400 });
        }
        if (error.message === 'RegionNotFound') {
             return NextResponse.json({ error: 'Target region not found or does not belong to location' }, { status: 400 });
        }

        // Clean up newly uploaded file ONLY if transaction failed *before* the upload attempt
        // If upload happened post-transaction and failed, it's handled above.
        // This cleanup might be less relevant with the deferred upload approach.
        // if (newImageUploaded && savedImagePath && savedImagePath !== oldImagePath) { ... }

        return NextResponse.json({ error: `Failed to update item: ${error.message || 'Unknown error'}` }, { status: 500 });
    }
}

// DELETE /api/inventory/:id - Deletes a specific item
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const itemId = parseInt(id);
    const db = getDb();

    if (isNaN(itemId)) {
        return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    try {
         // Use transaction for consistency
        const deleteTx = db.transaction(() => {
            // 1. Get current item to find image path
            const item: { image_path: string | null } | undefined = db.prepare(
                 'SELECT image_path FROM items WHERE id = ?'
                 ).get(itemId) as { image_path: string | null } | undefined;

             if (!item) {
                return { success: false, status: 404, error: 'Item not found' };
            }
            const imagePathToDelete = item.image_path;

            // 2. Delete associated tags FIRST (or ensure FK cascade delete)
            const deleteTagsStmt = db.prepare('DELETE FROM item_tags WHERE item_id = ?');
            const tagInfo = deleteTagsStmt.run(itemId);
            console.log(`[DELETE /inventory/${itemId}] Deleted ${tagInfo.changes} tags.`);

            // 3. Delete item from database
            const itemDeleteInfo = db.prepare('DELETE FROM items WHERE id = ?').run(itemId);

            if (itemDeleteInfo.changes === 0) {
                 // Item disappeared between check and delete, or tags deleted but item failed?
                 // Throw an error to rollback the tag deletion
                 throw new Error('ItemNotFoundDuringDelete');
            }

            // 4. Delete associated image file AFTER successful DB deletion
            if (imagePathToDelete) {
                 // Defer the async operation until after transaction commits
                 // deleteUpload(imagePathToDelete).catch(...) // Handled outside transaction
            }

            // Return info needed for post-transaction steps
            return { success: true, status: 200, imagePathToDelete };
        });

        const result = deleteTx();

        // Post-transaction image deletion
        if (result.success && result.imagePathToDelete) {
            deleteUpload(result.imagePathToDelete)
                .then(() => console.log(`[DELETE /inventory/${itemId}] Image ${result.imagePathToDelete} deleted.`))
                .catch((err: any) => console.error(`[DELETE /inventory/${itemId}] Failed to delete image ${result.imagePathToDelete}:`, err));
        }

        if (!result.success) {
             // Error already contains status and message from transaction return
             return NextResponse.json({ error: result.error }, { status: result.status });
        }

        return NextResponse.json({ message: 'Item deleted successfully' });

    } catch (error: any) {
        console.error(`[DELETE /inventory/${itemId}] Error deleting item:`, error);
        // Handle specific transaction errors like ItemNotFoundDuringDelete
        if (error.message === 'ItemNotFoundDuringDelete') {
             return NextResponse.json({ error: 'Item not found during delete process' }, { status: 404 });
        }
        if (error instanceof Database.SqliteError) {
             return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
        }
        return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
    }
}