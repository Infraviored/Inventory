import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@lib/db';

// Interface for the row structure returned by the locations query
interface LocationRow {
    id: number;
    name: string;
    parent_id: number | null; // parent_id can be null for root locations
}

// Helper to format breadcrumb data (only need id and name)
function formatBreadcrumb(location: any): { id: number; name: string } | null {
    if (!location || typeof location !== 'object') return null;
    return {
        id: location.id,
        name: location.name,
    };
}

// GET /api/locations/:id/breadcrumbs - Fetches breadcrumbs for a location
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params;
    const locationId = parseInt(id);
    const db = getDb();

    if (isNaN(locationId)) {
        return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
    }

    try {
        const breadcrumbs: any[] = [];
        let currentId: number | null = locationId;

        // Traverse up the parent chain
        while (currentId !== null) {
            const stmt = db.prepare('SELECT id, name, parent_id FROM locations WHERE id = ?');
            // Explicitly cast the result to LocationRow
            const location = stmt.get(currentId) as LocationRow | undefined;

            if (!location) {
                // If the initial ID is not found, return 404
                if (currentId === locationId) {
                    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
                }
                // If a parent is missing mid-chain, stop and return what we have
                console.warn(`Breadcrumb chain broken: Parent location with ID ${currentId} not found.`);
                break;
            }

            const formatted = formatBreadcrumb(location);
            if (formatted) {
                 breadcrumbs.unshift(formatted); // Add to the beginning of the array
            }
           

            // Move to the parent ID, ensuring null is handled
            // Type assertion ensures parent_id is accessible
            currentId = typeof location.parent_id === 'number' ? location.parent_id : null;
        }

        if (breadcrumbs.length === 0 && currentId !== locationId) {
             // This case implies the loop ran but didn't find the initial location, though the 404 above should catch it.
             // Adding a safeguard.
             return NextResponse.json({ error: 'Location not found or breadcrumb construction failed' }, { status: 404 });
        }

        return NextResponse.json(breadcrumbs);

    } catch (error) {
        console.error(`Error fetching breadcrumbs for location ${locationId}:`, error);
        return NextResponse.json({ error: 'Failed to fetch breadcrumbs' }, { status: 500 });
    }
}
