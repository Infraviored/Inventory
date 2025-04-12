import { NextRequest, NextResponse } from 'next/server';
import { getInventoryItemById, getLocationById, getRegionById } from '@/lib/db';

// This API will be used by microcontrollers to activate LEDs at the correct locations
// when objects are found through the search interface

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const item = getInventoryItemById(id);
    
    if (!item) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }
    
    // If the item doesn't have a location or region, we can't activate an LED
    if (!item.location_id || !item.region_id) {
      return NextResponse.json(
        { error: 'Item does not have a specific location with region' },
        { status: 400 }
      );
    }
    
    const location = getLocationById(item.location_id);
    const region = getRegionById(item.region_id);
    
    if (!location || !region) {
      return NextResponse.json(
        { error: 'Location or region not found' },
        { status: 404 }
      );
    }
    
    // Return the data needed for LED activation
    // A microcontroller would use this data to determine which LED to light up
    return NextResponse.json({
      item: {
        id: item.id,
        name: item.name
      },
      location: {
        id: location.id,
        name: location.name
      },
      region: {
        id: region.id,
        name: region.name,
        x: region.x_coord,
        y: region.y_coord,
        width: region.width,
        height: region.height
      },
      // Center point of the region (for LED positioning)
      ledPosition: {
        x: region.x_coord + (region.width / 2),
        y: region.y_coord + (region.height / 2)
      }
    });
  } catch (error) {
    console.error('Error fetching LED activation data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LED activation data' },
      { status: 500 }
    );
  }
}
