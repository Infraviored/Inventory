import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// This API will be used by microcontrollers to activate LEDs at the correct locations
// when objects are found through the search interface

// Interface for the joined data structure
interface ItemLocationRegion {
    itemId: number;
    itemName: string;
    locationId: number;
    locationName: string;
    regionId: number | null;
    regionName: string | null;
    xCoord: number | null;
    yCoord: number | null;
    width: number | null;
    height: number | null;
    // Add other relevant fields needed for LED calculation/activation
}

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
        // Fetch item, its location, and potentially its assigned region
        // Using LEFT JOIN in case an item isn't assigned to a specific region within its location
        const stmt = db.prepare(`
            SELECT
                i.id AS itemId,
                i.name AS itemName,
                l.id AS locationId,
                l.name AS locationName,
                r.id AS regionId,
                r.name AS regionName,
                r.x_coord AS xCoord,
                r.y_coord AS yCoord,
                r.width AS width,
                r.height AS height
                -- Select other columns needed from items (i), locations (l), location_regions (r)
            FROM items i
            JOIN locations l ON i.location_id = l.id
            LEFT JOIN location_regions r ON i.region_id = r.id -- Assuming items have a region_id column
            WHERE i.id = ?
        `);

        // TODO: Verify the JOIN condition for regions. Does `items` have a `region_id`?
        // If not, the logic to associate an item with a region needs clarification.

        const data = stmt.get(itemId) as ItemLocationRegion | undefined;

        if (!data) {
            return NextResponse.json({ error: 'Item not found or associated data missing' }, { status: 404 });
        }

        // Check if the item is in a location that has specific regions defined
        // This logic might replace the old check for 'Item does not have a specific location with region'
        if (data.regionId === null) {
            // Decide how to handle items not in a specific region. 
            // Maybe return location-level data or a specific error/status?
            // For now, mirroring the old 400 error, but this might need adjustment.
            console.warn(`Item ${itemId} found in location ${data.locationId}, but not assigned to a specific region.`);
            // return NextResponse.json({ error: 'Item location does not have a specific region assignment' }, { status: 400 });
            // OR perhaps return location data only?
            // For now, just return the available data
        }

        // Placeholder: Here you would add the logic to calculate LED activation data
        // based on the fetched item, location, and region info (xCoord, yCoord, etc.)
        // This logic depends heavily on the hardware/LED setup.
        const ledActivationData = {
            message: "LED activation data placeholder",
            item: {
                 id: data.itemId,
                 name: data.itemName
            },
            location: {
                id: data.locationId,
                name: data.locationName
            },
            region: data.regionId ? {
                id: data.regionId,
                name: data.regionName,
                x: data.xCoord,
                y: data.yCoord,
                width: data.width,
                height: data.height
            } : null,
            // Example calculated LED coordinates:
            // ledX: calculateLedX(data.xCoord, data.width), 
            // ledY: calculateLedY(data.yCoord, data.height),
        };

        return NextResponse.json(ledActivationData);

    } catch (error: any) {
        console.error(`Error fetching LED activation data for item ${itemId}:`, error);
        return NextResponse.json({ error: 'Failed to fetch LED activation data' }, { status: 500 });
    }
}
