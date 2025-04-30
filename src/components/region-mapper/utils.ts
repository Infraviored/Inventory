import { ActiveRegion, SnapPositions, Point, Size, MagnetismConfig } from './types';

// Find snap positions based on other regions and config
export function findSnapPositions(
  regions: ActiveRegion[], 
  currentRegion: ActiveRegion | null,
  imageSize: Size,
  config: MagnetismConfig
): SnapPositions {
  if (config.type === 'none') {
    return {
      x: [], y: [], right: [], bottom: [], centerX: [], centerY: []
    };
  }

  const snapPositions: SnapPositions = {
    x: [],        // Left edge positions
    y: [],        // Top edge positions
    right: [],    // Right edge positions
    bottom: [],   // Bottom edge positions
    centerX: [],  // Horizontal center positions
    centerY: []   // Vertical center positions
  };
  
  // Add image boundaries
  snapPositions.x.push(0);
  snapPositions.y.push(0);
  snapPositions.right.push(imageSize.width);
  snapPositions.bottom.push(imageSize.height);
  
  // Track the relative distances between regions
  const horizontalDistances = new Set<number>();
  const verticalDistances = new Set<number>();
  
  // First collect all region positions
  const regionPositions: Array<{
    left: number;
    right: number;
    top: number;
    bottom: number;
    id: string;
  }> = regions
    .filter(r => !currentRegion || r.id !== currentRegion.id)
    .map(r => ({
      left: r.x,
      right: r.x + r.width,
      top: r.y,
      bottom: r.y + r.height,
      id: r.id
    }));
  
  // Calculate all pairwise distances between regions
  for (let i = 0; i < regionPositions.length; i++) {
    for (let j = i + 1; j < regionPositions.length; j++) {
      const r1 = regionPositions[i];
      const r2 = regionPositions[j];
      
      // Horizontal distances
      horizontalDistances.add(Math.abs(r1.left - r2.left));     // Left to left
      horizontalDistances.add(Math.abs(r1.right - r2.right));   // Right to right
      horizontalDistances.add(Math.abs(r1.right - r2.left));    // Right to left
      horizontalDistances.add(Math.abs(r1.left - r2.right));    // Left to right
      
      // Vertical distances
      verticalDistances.add(Math.abs(r1.top - r2.top));         // Top to top
      verticalDistances.add(Math.abs(r1.bottom - r2.bottom));   // Bottom to bottom
      verticalDistances.add(Math.abs(r1.bottom - r2.top));      // Bottom to top
      verticalDistances.add(Math.abs(r1.top - r2.bottom));      // Top to bottom
    }
  }
  
  // Add positions from other regions
  regions.forEach(region => {
    // Skip the current region
    if (currentRegion && region.id === currentRegion.id) return;
    
    // Add all region edge positions (left, right, top, bottom)
    snapPositions.x.push(region.x);                    // Left edge
    snapPositions.y.push(region.y);                    // Top edge
    snapPositions.right.push(region.x + region.width); // Right edge  
    snapPositions.bottom.push(region.y + region.height); // Bottom edge
    
    // --- Edge Snapping (Applies if type is 'edges' or 'distance') ---
    if (config.type === 'edges' || config.type === 'distance') {
      // Current region left edge can snap to other region right edge
      snapPositions.x.push(region.x + region.width); 
      // Current region right edge can snap to other region left edge
      snapPositions.right.push(region.x);
      // Current region top edge can snap to other region bottom edge
      snapPositions.y.push(region.y + region.height); 
      // Current region bottom edge can snap to other region top edge
      snapPositions.bottom.push(region.y);
      // Center alignment is also considered part of edge/structure snapping
      const centerX = region.x + region.width / 2;
      const centerY = region.y + region.height / 2;
      snapPositions.centerX.push(centerX);
      snapPositions.centerY.push(centerY);
    }
    // --- End Edge Snapping ---

    // --- Distance Snapping (Only if type is 'distance') ---
    if (config.type === 'distance') {
        // For horizontal distances (add to both left and right)
        horizontalDistances.forEach(distance => {
          // Left edge at 'distance' away from this region's edges
          snapPositions.x.push(region.x - distance);
          snapPositions.x.push(region.x + region.width + distance);
          // Right edge at 'distance' away from this region's edges
          snapPositions.right.push(region.x + distance);
          snapPositions.right.push(region.x + region.width - distance);
        });
        
        // For vertical distances (add to both top and bottom)
        verticalDistances.forEach(distance => {
          // Top edge at 'distance' away from this region's edges
          snapPositions.y.push(region.y - distance);
          snapPositions.y.push(region.y + region.height + distance);
          // Bottom edge at 'distance' away from this region's edges
          snapPositions.bottom.push(region.y + distance);
          snapPositions.bottom.push(region.y + region.height - distance);
        });
    }
    // --- End Distance Snapping ---
  });
  
  return snapPositions;
}

// Find nearest snap position using configurable distance
export function findNearestSnap(value: number, positions: number[], snapDistance: number): number | null {
  let nearest = null;
  let minDistance = snapDistance + 1;
  
  for (const pos of positions) {
    const distance = Math.abs(value - pos);
    if (distance < snapDistance && distance < minDistance) {
      nearest = pos;
      minDistance = distance;
    }
  }
  
  return nearest;
}

// Apply snapping to coordinates using config
export function applySnapping(
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  regions: ActiveRegion[],
  currentRegion: ActiveRegion | null,
  imageSize: Size,
  config: MagnetismConfig,
  isResizing: boolean = false
): { x: number; y: number; width: number; height: number } {
  
  if (config.type === 'none') {
    return { x, y, width, height };
  }

  const snapPositions = findSnapPositions(regions, currentRegion, imageSize, config);
  const snapDistance = config.distance;
  
  let newX = x;
  let newY = y;
  let newWidth = width;
  let newHeight = height;

  if (isResizing) {
    const snapRight = findNearestSnap(x + width, snapPositions.right, snapDistance);
    const snapBottom = findNearestSnap(y + height, snapPositions.bottom, snapDistance);

    if (snapRight !== null) {
        newWidth = snapRight - x; 
    }
    if (snapBottom !== null) {
        newHeight = snapBottom - y;
    }
    newWidth = Math.max(10, newWidth);
    newHeight = Math.max(10, newHeight);
    
    return { x, y, width: newWidth, height: newHeight };

  } else {
    const snapX = findNearestSnap(x, snapPositions.x, snapDistance);
    const snapRight = findNearestSnap(x + width, snapPositions.right, snapDistance);
    const snapY = findNearestSnap(y, snapPositions.y, snapDistance);
    const snapBottom = findNearestSnap(y + height, snapPositions.bottom, snapDistance);
    const centerX = x + width / 2;
    const snapCenterX = findNearestSnap(centerX, snapPositions.centerX, snapDistance);
    const centerY = y + height / 2;
    const snapCenterY = findNearestSnap(centerY, snapPositions.centerY, snapDistance);
    
    if (snapX !== null) {
      newX = snapX;
    } else if (snapRight !== null) {
      newX = snapRight - width;
    } else if (snapCenterX !== null && (config.type === 'edges' || config.type === 'distance')) {
      newX = snapCenterX - width / 2;
    }
    
    if (snapY !== null) {
      newY = snapY;
    } else if (snapBottom !== null) {
      newY = snapBottom - height;
    } else if (snapCenterY !== null && (config.type === 'edges' || config.type === 'distance')) {
      newY = snapCenterY - height / 2;
    }

    return { x: newX, y: newY, width, height };
  }
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
