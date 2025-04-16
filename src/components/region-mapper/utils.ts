import { ActiveRegion, SnapPositions, Point, Size } from './types';

// Snap threshold in pixels - increased for stronger magnetic effect
export const SNAP_THRESHOLD = 10;

// Find snap positions based on other regions
export function findSnapPositions(
  regions: ActiveRegion[], 
  currentRegion: ActiveRegion | null,
  imageSize: Size
): SnapPositions {
  const snapPositions: SnapPositions = {
    x: [],
    y: [],
    right: [],
    bottom: []
  };
  
  // Add image boundaries
  snapPositions.x.push(0);
  snapPositions.y.push(0);
  snapPositions.right.push(imageSize.width);
  snapPositions.bottom.push(imageSize.height);
  
  // Add positions from other regions
  regions.forEach(region => {
    // Skip the current region
    if (currentRegion && region.id === currentRegion.id) return;
    
    // Add left, right, top, bottom positions
    snapPositions.x.push(region.x);
    snapPositions.y.push(region.y);
    snapPositions.right.push(region.x + region.width);
    snapPositions.bottom.push(region.y + region.height);
    
    // Add center positions for better alignment
    snapPositions.x.push(region.x + region.width / 2);
    snapPositions.y.push(region.y + region.height / 2);
    
    // Add quarter positions for more precise alignment
    snapPositions.x.push(region.x + region.width / 4);
    snapPositions.x.push(region.x + (region.width * 3) / 4);
    snapPositions.y.push(region.y + region.height / 4);
    snapPositions.y.push(region.y + (region.height * 3) / 4);
  });
  
  return snapPositions;
}

// Find nearest snap position
export function findNearestSnap(value: number, positions: number[]): number | null {
  let nearest = null;
  let minDistance = SNAP_THRESHOLD + 1;
  
  for (const pos of positions) {
    const distance = Math.abs(value - pos);
    if (distance < SNAP_THRESHOLD && distance < minDistance) {
      nearest = pos;
      minDistance = distance;
    }
  }
  
  return nearest;
}

// Apply snapping to coordinates
export function applySnapping(
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  regions: ActiveRegion[],
  currentRegion: ActiveRegion | null,
  imageSize: Size
): { x: number; y: number; width: number; height: number } {
  const snapPositions = findSnapPositions(regions, currentRegion, imageSize);
  
  // Check for snapping on left edge
  const snapX = findNearestSnap(x, snapPositions.x);
  // Check for snapping on right edge
  const snapRight = findNearestSnap(x + width, snapPositions.right);
  // Check for snapping on top edge
  const snapY = findNearestSnap(y, snapPositions.y);
  // Check for snapping on bottom edge
  const snapBottom = findNearestSnap(y + height, snapPositions.bottom);
  
  return {
    x: snapX !== null ? snapX : (snapRight !== null ? snapRight - width : x),
    y: snapY !== null ? snapY : (snapBottom !== null ? snapBottom - height : y),
    width,
    height
  };
}

// Create a new region with a unique ID
export function createNewRegion(
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  customId?: string,
  name: string = ''
): ActiveRegion {
  return {
    id: customId || `region-${Date.now()}`,
    x,
    y,
    width,
    height,
    name,
    isSelected: true,
    isResizing: false,
    isDragging: false
  };
}

// Calculate rectangle dimensions from two points
export function getRectangleDimensions(startPoint: Point, currentPoint: Point): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.min(startPoint.x, currentPoint.x),
    y: Math.min(startPoint.y, currentPoint.y),
    width: Math.abs(currentPoint.x - startPoint.x),
    height: Math.abs(currentPoint.y - startPoint.y)
  };
}
