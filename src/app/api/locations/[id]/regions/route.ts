// Updated API route to use the storage provider instead of Flask backend
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@lib/db';

// Helper to format region data (consistent format)
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

// GET /api/locations/:id/regions - Fetches regions for a specific location
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params;
    const locationId = parseInt(id);
    const db = getDb();

    if (isNaN(locationId)) {
        return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
    }

    try {
        // Check if location exists (optional, but good practice)
        const locationCheck = db.prepare('SELECT id FROM locations WHERE id = ?').get(locationId);
        if (!locationCheck) {
            return NextResponse.json({ error: `Location with ID ${locationId} not found` }, { status: 404 });
        }

        const stmt = db.prepare('SELECT * FROM location_regions WHERE location_id = ?');
        const regions = stmt.all(locationId);

        return NextResponse.json(regions.map(formatRegion));
    } catch (error) {
        console.error(`Error fetching regions for location ${locationId}:`, error);
        return NextResponse.json({ error: 'Failed to fetch regions' }, { status: 500 });
    }
}

// POST /api/locations/:id/regions - Creates a new region for a location
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params;
    const locationId = parseInt(id);
    const db = getDb();

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

        // Check if parent location exists
        const locationCheck = db.prepare('SELECT id FROM locations WHERE id = ?').get(locationId);
        if (!locationCheck) {
            return NextResponse.json({ error: `Location with ID ${locationId} not found` }, { status: 404 });
        }

        // Insert the new region
        const stmt = db.prepare(
            'INSERT INTO location_regions (location_id, name, x_coord, y_coord, width, height) VALUES (?, ?, ?, ?, ?, ?)'
        );
        const info = stmt.run(locationId, name, x, y, width, height);
        const newRegionId = info.lastInsertRowid;

        // Fetch and return the newly created region
        const newRegion = db.prepare('SELECT * FROM location_regions WHERE id = ?').get(newRegionId);

        if (!newRegion) {
             return NextResponse.json({ error: 'Failed to retrieve region after creation' }, { status: 500 });
        }

        return NextResponse.json(formatRegion(newRegion), { status: 201 });
    } catch (error: any) {
        console.error(`Error creating region for location ${locationId}:`, error);
        // Handle potential JSON parsing errors explicitly
        if (error instanceof SyntaxError) {
             return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
        }
        return NextResponse.json({ error: `Failed to create region: ${error.message || 'Unknown error'}` }, { status: 500 });
    }
}
