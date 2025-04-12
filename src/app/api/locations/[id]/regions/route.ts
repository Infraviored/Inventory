import { NextRequest, NextResponse } from 'next/server';
import { 
  getLocationRegions,
  addLocationRegion
} from '@/lib/memory-db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const locationId = parseInt(params.id);
    
    const regions = getLocationRegions(locationId);
    
    return NextResponse.json(regions);
  } catch (error) {
    console.error('Error fetching regions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch regions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const locationId = parseInt(params.id);
    const data = await request.json();
    
    const { name, x, y, width, height } = data;
    
    const regionId = addLocationRegion(
      locationId,
      name,
      x,
      y,
      width,
      height
    );
    
    return NextResponse.json({
      id: regionId,
      locationId,
      name,
      x,
      y,
      width,
      height
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating region:', error);
    return NextResponse.json(
      { error: 'Failed to create region' },
      { status: 500 }
    );
  }
}
