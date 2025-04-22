import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@lib/db';
import Database from 'better-sqlite3'; // For error checking

// Helper to format region data
function formatRegion(region: any): any {
    if (!region) return null;
    return {
        id: region.id,
        locationId: region.location_id,
        name: region.name,
        x: region.x_coord,
        y: region.y_coord,
        width: region.width,
        height: region.height,
        createdAt: region.created_at,
        updatedAt: region.updated_at
    };
}

// Interface for expected PUT body
interface UpdateRegionBody {
    name?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}

// PUT /api/locations/:locationId/regions/:regionId - Updates a specific region
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string, regionId: string } }
) {
    const { id: locationIdStr, regionId: regionIdStr } = params;
    const locationId = parseInt(locationIdStr);
    const regionId = parseInt(regionIdStr);
    const db = getDb();

    if (isNaN(locationId) || isNaN(regionId)) {
        return NextResponse.json({ error: 'Invalid location or region ID format' }, { status: 400 });
    }

    let updateData: UpdateRegionBody;
    try {
        updateData = await request.json();
        // Basic validation: ensure at least one field is being updated
        if (Object.keys(updateData).length === 0) {
             return NextResponse.json({ error: 'Request body cannot be empty' }, { status: 400 });
        }
        // More specific validation (e.g., types) can be added here if needed
        if (updateData.name === null || updateData.name === "") {
             return NextResponse.json({ error: 'Region name cannot be empty' }, { status: 400 });
        }
         if ((updateData.x != null && typeof updateData.x !== 'number') ||
             (updateData.y != null && typeof updateData.y !== 'number') ||
             (updateData.width != null && typeof updateData.width !== 'number') ||
             (updateData.height != null && typeof updateData.height !== 'number')) {
              return NextResponse.json({ error: 'Coordinates and dimensions must be numbers' }, { status: 400 });
         }


    } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    try {
        // Use transaction to check existence and update
        const updateTx = db.transaction((data) => {
            // 1. Check if location and region exist and are linked
            const regionCheck = db.prepare(
                 'SELECT id FROM location_regions WHERE id = ? AND location_id = ?'
            ).get(data.regionId, data.locationId);

            if (!regionCheck) {
                throw new Error('RegionNotFound');
            }

            // 2. Construct update query dynamically based on provided fields
            const fieldsToUpdate: string[] = [];
            const valuesToUpdate: (string | number | null)[] = [];

            if (data.updateData.name !== undefined) {
                fieldsToUpdate.push('name = ?');
                valuesToUpdate.push(data.updateData.name);
            }
            if (data.updateData.x !== undefined) {
                fieldsToUpdate.push('x_coord = ?');
                valuesToUpdate.push(data.updateData.x);
            }
            if (data.updateData.y !== undefined) {
                fieldsToUpdate.push('y_coord = ?');
                valuesToUpdate.push(data.updateData.y);
            }
            if (data.updateData.width !== undefined) {
                fieldsToUpdate.push('width = ?');
                valuesToUpdate.push(data.updateData.width);
            }
            if (data.updateData.height !== undefined) {
                fieldsToUpdate.push('height = ?');
                valuesToUpdate.push(data.updateData.height);
            }

            if (fieldsToUpdate.length === 0) {
                 // Should be caught by earlier validation, but safeguard
                 throw new Error('NoValidFieldsToUpdate');
            }

            const updateQuery = `UPDATE location_regions SET ${fieldsToUpdate.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND location_id = ?`;
            valuesToUpdate.push(data.regionId, data.locationId);

            const info = db.prepare(updateQuery).run(...valuesToUpdate);

            if (info.changes === 0) {
                 // Should be caught by regionCheck, but safeguard
                 throw new Error('UpdateFailedItemDisappeared');
            }
            return info.changes;
        });

        const changes = updateTx({ locationId, regionId, updateData });

        if (changes > 0) {
            // Fetch and return the updated region
            const updatedRegion = db.prepare('SELECT * FROM location_regions WHERE id = ?').get(regionId);
            return NextResponse.json(formatRegion(updatedRegion));
        } else {
             // Should not happen if transaction logic is correct
             return NextResponse.json({ error: 'Update failed, region not found or no changes made' }, { status: 404 });
        }

    } catch (error: any) {
        console.error(`Error updating region ${regionId} for location ${locationId}:`, error);
        if (error.message === 'RegionNotFound') {
             return NextResponse.json({ error: 'Region not found or does not belong to this location' }, { status: 404 });
        }
         if (error.message === 'NoValidFieldsToUpdate' || error.message === 'UpdateFailedItemDisappeared') {
              return NextResponse.json({ error: 'Update failed internally' }, { status: 500 });
         }
        return NextResponse.json({ error: 'Failed to update region' }, { status: 500 });
    }
}


// DELETE /api/locations/:locationId/regions/:regionId - Deletes a specific region
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string, regionId: string } }
) {
    const { id: locationIdStr, regionId: regionIdStr } = params;
    const locationId = parseInt(locationIdStr);
    const regionId = parseInt(regionIdStr);
    const db = getDb();

    if (isNaN(locationId) || isNaN(regionId)) {
        return NextResponse.json({ error: 'Invalid location or region ID format' }, { status: 400 });
    }

    try {
        // Check if the region exists and belongs to the location before deleting
        const regionCheck = db.prepare(
             'SELECT id FROM location_regions WHERE id = ? AND location_id = ?'
        ).get(regionId, locationId);

        if (!regionCheck) {
            return NextResponse.json({ error: 'Region not found or does not belong to this location' }, { status: 404 });
        }

        // Delete the region
        const info = db.prepare(
             'DELETE FROM location_regions WHERE id = ? AND location_id = ?'
        ).run(regionId, locationId);

        if (info.changes === 0) {
            // Should be caught by regionCheck, but safeguard
             return NextResponse.json({ error: 'Region not found during delete attempt' }, { status: 404 });
        }

        // Return success, no content
        return new NextResponse(null, { status: 204 });

    } catch (error: any) {
        console.error(`Error deleting region ${regionId} for location ${locationId}:`, error);
         // Catch potential SqliteError (e.g., foreign key constraint if items reference regions)
        if (error instanceof Database.SqliteError) {
             return NextResponse.json({ error: `Database error: ${error.message}. Cannot delete region if items are assigned to it.` }, { status: 409 }); // Conflict
        }
        return NextResponse.json({ error: 'Failed to delete region' }, { status: 500 });
    }
} 