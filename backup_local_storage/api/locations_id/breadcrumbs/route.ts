import { NextRequest, NextResponse } from 'next/server';
import { 
  getLocationBreadcrumbs
} from '@/lib/memory-db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const locationId = parseInt(params.id);
    
    const breadcrumbs = getLocationBreadcrumbs(locationId);
    
    return NextResponse.json(breadcrumbs);
  } catch (error) {
    console.error('Error fetching breadcrumbs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch breadcrumbs' },
      { status: 500 }
    );
  }
}
