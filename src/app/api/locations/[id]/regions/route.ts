// Updated API route to use the storage provider instead of Flask backend
import { NextRequest, NextResponse } from 'next/server';
import {
    getLocationById as getLocationByIdFromDb,
    // We might need a specific function to add a region if POST is kept
    LocationRegion, // Import type from new db lib
    // getRegionsByLocationId, // Removed as not exported from @lib/db
    // addRegionToLocation // Removed as not exported from @lib/db
} from '@lib/db';

// Force dynamic rendering/evaluation for this route
export const dynamic = 'force-dynamic';

// Helper to format region data (consistent format)
function formatApiResponseRegion(region: LocationRegion): any {
    if (!region) return null;
    return {
        id: region.id,
        locationId: region.location_id,
        name: region.name,
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height,
        createdAt: region.createdAt,
        updatedAt: region.updatedAt
    };
}

// Define the expected structure of the context parameters
interface RouteContext {
  params: {
    id: string;
  };
}

// GET /api/locations/:id/regions - Fetches regions for a specific location
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const locationIdStr = resolvedParams.id;
    console.log(`[JSON_DB_API GET /locations/${locationIdStr}/regions] Received request.`);

    const locationId = parseInt(locationIdStr);

    if (isNaN(locationId)) {
        return NextResponse.json({ error: 'Invalid location ID format in URL' }, { status: 400 });
    }

    try {
        const location = getLocationByIdFromDb(locationId);
        
        if (!location) {
            return NextResponse.json({ error: `Location with ID ${locationId} not found` }, { status: 404 });
        }

        const regions = location.regions || [];
        console.log(`[JSON_DB_API GET /locations/${locationIdStr}/regions] Found ${regions.length} regions.`);
        return NextResponse.json(regions.map(formatApiResponseRegion));

    } catch (error: any) {
        console.error(`[JSON_DB_API GET /locations/${locationIdStr}/regions] Error fetching regions:`, error);
        return NextResponse.json({ error: `Failed to fetch regions: ${error.message}` }, { status: 500 });
    }
}

/* 
// POST /api/locations/:id/regions - Creates a new region for a location
// Commenting out for now, as region creation is handled by POST /api/locations and PUT /api/locations/:id
// If a separate endpoint to add a region to an EXISTING location is needed, this can be implemented
// with a new db function like `addRegionToLocation(locationId, regionData)`.

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const locationIdStr = resolvedParams.id;
    console.log(`[JSON_DB_API POST /locations/${locationIdStr}/regions] Received request.`);

    const locationId = parseInt(locationIdStr);
    // const db = getDb(); // Old DB call

    if (isNaN(locationId)) {
        return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
    }

    try {
        const region = await request.json();

        // Basic validation
        if (!region || typeof region !== 'object') {
             return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }
        const { name, x, y, width, height } = region;
        if (name == null || x == null || y == null || width == null || height == null) {
            return NextResponse.json({ error: 'Missing required fields (name, x, y, width, height)' }, { status: 400 });
        }

        // TODO: Implement with new DB logic if needed
        // 1. Check if parent location exists using getLocationByIdFromDb(locationId)
        // 2. Create a new function in lib/db.ts: addRegionToLocation(locationId, newRegionData)
        //    This function would:
        //      - Load the DB
        //      - Find the location
        //      - Generate a new region ID
        //      - Create the new region object
        //      - Add it to the global `location_regions` array
        //      - Add it (or its copy) to the `regions` array of the found location object
        //      - Save the DB
        //      - Return the new region
        // 3. Call that function here.

        // Placeholder for the new logic:
        // const newRegion = await addRegionToLocation(locationId, { name, x, y, width, height });
        // if (!newRegion) {
        //     return NextResponse.json({ error: 'Failed to create region or location not found' }, { status: 500 });
        // }
        // return NextResponse.json(formatApiResponseRegion(newRegion), { status: 201 });

        return NextResponse.json({ message: 'POST to /locations/:id/regions not yet implemented with JSON DB' }, { status: 501 });

    } catch (error: any) {
        console.error(`Error creating region for location ${locationId}:`, error);
        if (error instanceof SyntaxError) {
             return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
        }
        return NextResponse.json({ error: `Failed to create region: ${error.message || 'Unknown error'}` }, { status: 500 });
    }
}
*/
