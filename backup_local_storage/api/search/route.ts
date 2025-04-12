import { NextRequest, NextResponse } from 'next/server';
import { 
  searchItems
} from '@/lib/memory-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json([]);
    }
    
    const results = searchItems(query);
    
    // Transform the data to include full image paths
    const transformedResults = results.map(item => ({
      ...item,
      imagePath: item.imagePath ? `/uploads/${item.imagePath}` : null,
    }));
    
    return NextResponse.json(transformedResults);
  } catch (error) {
    console.error('Error searching items:', error);
    return NextResponse.json(
      { error: 'Failed to search items' },
      { status: 500 }
    );
  }
}
