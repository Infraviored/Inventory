"use client";

import { useState, useEffect, useRef } from 'react';
import { getLocationRegions, addLocationRegion, Region } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Move, Square, Trash } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useLanguage } from '@/lib/language';

// This is the component used by location-form.tsx
interface RegionMapperFormProps {
  imageSrc: string;
  onComplete: (regions: Array<{name: string, x: number, y: number, width: number, height: number}>) => void;
  initialRegions?: Array<{name: string, x: number, y: number, width: number, height: number}>;
}

interface ActiveRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
  name: string;
  isSelected: boolean;
  isResizing: boolean;
  isDragging: boolean;
}

// Snap threshold in pixels
const SNAP_THRESHOLD = 5;

export function RegionMapper({ imageSrc, onComplete, initialRegions = [] }: RegionMapperFormProps) {
  const { t } = useLanguage();
  
  // Region state
  const [regions, setRegions] = useState<ActiveRegion[]>(
    initialRegions.map((r, i) => ({
      ...r,
      id: `region-${i}-${Date.now()}`,
      isSelected: false,
      isResizing: false,
      isDragging: false,
    }))
  );
  
  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [regionName, setRegionName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [manualDimensions, setManualDimensions] = useState({
    x: 10,
    y: 10,
    width: 100,
    height: 100
  });
  const [dragStartPos, setDragStartPos] = useState<{x: number, y: number} | null>(null);
  const [resizeStartDims, setResizeStartDims] = useState<{width: number, height: number} | null>(null);

  // Drawing state
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{x: number, y: number} | null>(null);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Load image dimensions on mount
  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      setImageSize({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      });
    }
  }, [imageSrc]);

  // Handle image load
  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageSize({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight
      });
    }
  };

  // Find snap positions based on other regions
  const findSnapPositions = (currentRegion: ActiveRegion | null) => {
    const snapPositions = {
      x: [] as number[],
      y: [] as number[],
      right: [] as number[],
      bottom: [] as number[]
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
    });
    
    return snapPositions;
  };

  // Find nearest snap position
  const findNearestSnap = (value: number, positions: number[]) => {
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
  };

  // Apply snapping to coordinates
  const applySnapping = (x: number, y: number, width: number, height: number, currentRegion: ActiveRegion | null) => {
    const snapPositions = findSnapPositions(currentRegion);
    
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
  };

  // Handle mouse down (start drawing or select region)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // If we're in creation mode, start drawing
    if (isCreating) {
      setStartPoint({ x, y });
      setCurrentPoint({ x, y });
      console.log(`Started drawing at (${x}, ${y})`);
      return;
    }
    
    // Check if we clicked on a resize handle
    const selectedRegion = regions.find(r => r.isSelected);
    if (selectedRegion) {
      const resizeHandleRect = {
        x: selectedRegion.x + selectedRegion.width - 10,
        y: selectedRegion.y + selectedRegion.height - 10,
        width: 20,
        height: 20
      };
      
      if (
        x >= resizeHandleRect.x && 
        x <= resizeHandleRect.x + resizeHandleRect.width && 
        y >= resizeHandleRect.y && 
        y <= resizeHandleRect.y + resizeHandleRect.height
      ) {
        // Clicked on resize handle
        setRegions(regions.map(r => ({
          ...r,
          isResizing: r.id === selectedRegion.id,
          isDragging: false
        })));
        setResizeStartDims({
          width: selectedRegion.width,
          height: selectedRegion.height
        });
        setDragStartPos({ x, y });
        return;
      }
    }
    
    // Check if we clicked on a region
    const clickedRegion = regions.find(region => 
      x >= region.x && 
      x <= (region.x + region.width) && 
      y >= region.y && 
      y <= (region.y + region.height)
    );
    
    if (clickedRegion) {
      // Select the region and prepare for dragging
      setRegions(regions.map(r => ({
        ...r,
        isSelected: r.id === clickedRegion.id,
        isDragging: r.id === clickedRegion.id,
        isResizing: false
      })));
      setSelectedRegionId(clickedRegion.id);
      setRegionName(clickedRegion.name);
      setDragStartPos({ x, y });
    } else {
      // Clicked outside any region, deselect all
      setRegions(regions.map(r => ({ ...r, isSelected: false, isDragging: false, isResizing: false })));
      setSelectedRegionId(null);
      setShowForm(false);
    }
  };

  // Handle mouse move (update rectangle or drag/resize)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // If we're drawing a new region
    if (isCreating && startPoint) {
      setCurrentPoint({ x, y });
      return;
    }
    
    // If we're dragging a region
    const draggingRegion = regions.find(r => r.isDragging);
    if (draggingRegion && dragStartPos) {
      // Calculate movement
      const deltaX = x - dragStartPos.x;
      const deltaY = y - dragStartPos.y;
      
      // Calculate new position
      let newX = Math.max(0, Math.min(draggingRegion.x + deltaX, imageSize.width - draggingRegion.width));
      let newY = Math.max(0, Math.min(draggingRegion.y + deltaY, imageSize.height - draggingRegion.height));
      
      // Apply snapping
      const snapped = applySnapping(newX, newY, draggingRegion.width, draggingRegion.height, draggingRegion);
      
      // Update region position
      setRegions(regions.map(r => {
        if (r.id === draggingRegion.id) {
          return {
            ...r,
            x: snapped.x,
            y: snapped.y
          };
        }
        return r;
      }));
      
      // Update drag start position
      setDragStartPos({ x, y });
    }
    
    // If we're resizing a region
    const resizingRegion = regions.find(r => r.isResizing);
    if (resizingRegion && dragStartPos && resizeStartDims) {
      // Calculate new dimensions
      const deltaX = x - dragStartPos.x;
      const deltaY = y - dragStartPos.y;
      
      const newWidth = Math.max(20, resizeStartDims.width + deltaX);
      const newHeight = Math.max(20, resizeStartDims.height + deltaY);
      
      // Ensure region stays within image bounds
      const boundedWidth = Math.min(newWidth, imageSize.width - resizingRegion.x);
      const boundedHeight = Math.min(newHeight, imageSize.height - resizingRegion.y);
      
      // Apply snapping for the right and bottom edges
      const right = resizingRegion.x + boundedWidth;
      const bottom = resizingRegion.y + boundedHeight;
      
      const snapPositions = findSnapPositions(resizingRegion);
      const snapRight = findNearestSnap(right, snapPositions.right);
      const snapBottom = findNearestSnap(bottom, snapPositions.bottom);
      
      const finalWidth = snapRight !== null ? snapRight - resizingRegion.x : boundedWidth;
      const finalHeight = snapBottom !== null ? snapBottom - resizingRegion.y : boundedHeight;
      
      // Update region dimensions
      setRegions(regions.map(r => {
        if (r.id === resizingRegion.id) {
          return {
            ...r,
            width: finalWidth,
            height: finalHeight
          };
        }
        return r;
      }));
    }
  };

  // Handle mouse up (finish dragging or resizing)
  const handleMouseUp = () => {
    // If we're creating a region and have both start and end points
    if (isCreating && startPoint && currentPoint) {
      const width = Math.abs(currentPoint.x - startPoint.x);
      const height = Math.abs(currentPoint.y - startPoint.y);
      
      if (width > 10 && height > 10) {
        const left = Math.min(startPoint.x, currentPoint.x);
        const top = Math.min(startPoint.y, currentPoint.y);

        // Apply snapping
        const snapped = applySnapping(left, top, width, height, null);

        // Create the new region
        const newRegion: ActiveRegion = {
          id: `region-${Date.now()}`,
          name: '',
          x: snapped.x,
          y: snapped.y,
          width: snapped.width,
          height: snapped.height,
          isSelected: true,
          isResizing: false,
          isDragging: false
        };
        
        setRegions(prev => prev.map(r => ({ ...r, isSelected: false })).concat(newRegion));
        setSelectedRegionId(newRegion.id);
        setRegionName('');
        setShowForm(true);
        
        // Exit creation mode after adding a region
        setIsCreating(false);
        
        console.log(`Created region: ${width}x${height} at (${left},${top})`);
      } else {
        console.log('Region too small, ignoring');
      }
      
      // Reset drawing state
      setStartPoint(null);
      setCurrentPoint(null);
      return;
    }
    
    // End any dragging or resizing
    setRegions(regions.map(r => ({
      ...r,
      isDragging: false,
      isResizing: false
    })));
    
    // Reset drag/resize tracking
    setDragStartPos(null);
    setResizeStartDims(null);
  };

  // Create region from manual dimensions
  const handleCreateManualRegion = () => {
    // Validate dimensions are within image bounds
    const { x, y, width, height } = manualDimensions;
    
    if (x < 0 || y < 0 || width <= 0 || height <= 0 || 
        x + width > imageSize.width || y + height > imageSize.height) {
      setError(t('common.error') + ': ' + t('regions.outOfBounds'));
      return;
    }
    
    // Apply snapping
    const snapped = applySnapping(x, y, width, height, null);
    
    const newRegion: ActiveRegion = {
      id: `region-${Date.now()}`,
      name: '',
      x: snapped.x,
      y: snapped.y,
      width: snapped.width,
      height: snapped.height,
      isSelected: true,
      isResizing: false,
      isDragging: false
    };
    
    setRegions(prev => prev.map(r => ({ ...r, isSelected: false })).concat(newRegion));
    setSelectedRegionId(newRegion.id);
    setRegionName('');
    setShowForm(true);
  };

  // Handle form submission to name a region
  const handleNameRegion = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!regionName.trim()) {
      setError(t('regions.name') + ' ' + t('common.required'));
      return;
    }
    
    setRegions(regions.map(r => {
      if (r.id === selectedRegionId) {
        return { ...r, name: regionName };
      }
      return r;
    }));
    
    setShowForm(false);
    setError(null);
    
    console.log(`Named region ${selectedRegionId} as "${regionName}"`);
  };

  // Remove a region
  const handleRemoveRegion = (id: string) => {
    setRegions(regions.filter(r => r.id !== id));
    if (selectedRegionId === id) {
      setSelectedRegionId(null);
      setShowForm(false);
    }
  };

  // Copy a region
  const handleCopyRegion = (id: string) => {
    const regionToCopy = regions.find(r => r.id === id);
    if (!regionToCopy) return;
    
    // Default offset for the copy
    let offsetX = 20;
    let offsetY = 20;
    
    // Try to align with the original region if possible
    const snapPositions = findSnapPositions(null);
    
    // Create the new region
    const newRegion: ActiveRegion = {
      ...regionToCopy,
      id: `region-${Date.now()}`,
      name: `${regionToCopy.name} (${t('common.copy')})`,
      x: Math.min(regionToCopy.x + offsetX, imageSize.width - regionToCopy.width),
      y: Math.min(regionToCopy.y + offsetY, imageSize.height - regionToCopy.height),
      isSelected: true,
      isResizing: false,
      isDragging: false
    };
    
    // Apply snapping to the copied region
    const snapped = applySnapping(newRegion.x, newRegion.y, newRegion.width, newRegion.height, null);
    newRegion.x = snapped.x;
    newRegion.y = snapped.y;
    
    setRegions(prev => 
      prev.map(r => ({ ...r, isSelected: false })).concat(newRegion)
    );
    setSelectedRegionId(newRegion.id);
  };

  // Calculate styles for the currently drawing rectangle
  const getDrawingRectStyle = () => {
    if (!isCreating || !startPoint || !currentPoint) return { display: 'none' };
    
    const left = Math.min(startPoint.x, currentPoint.x);
    const top = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);
    
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  };

  // Handle complete button click - send regions back to parent component
  const handleComplete = () => {
    // Check if all regions have names
    if (regions.some(r => !r.name.trim())) {
      setError(t('regions.allRegionsNeedNames'));
      return;
    }
    
    // Format regions for the parent component
    const formattedRegions = regions.map(r => ({
      name: r.name,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height
    }));
    
    // Call the onComplete callback with the formatted regions
    onComplete(formattedRegions);
  };

  return (
    <div className="space-y-4 border rounded-md p-4 bg-muted/50">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">{t('regions.title')}</h3>
        <div className="flex space-x-2">
          <Button 
            type="button" 
            size="sm"
            variant={isCreating ? "secondary" : "outline"}
            onClick={() => {
              setIsCreating(!isCreating);
              setStartPoint(null);
              setCurrentPoint(null);
            }}
          >
            <Square className="h-4 w-4 mr-1" />
            {isCreating ? t('regions.drawing') : t('regions.draw')}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Image container */}
        <div className="md:col-span-2 relative border rounded-md overflow-hidden bg-background">
          <div 
            ref={containerRef}
            className="relative"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img 
              ref={imageRef}
              src={imageSrc} 
              alt={t('regions.locationImage')}
              className="max-w-full h-auto"
              onLoad={handleImageLoad}
            />
            
            {/* Drawing overlay */}
            <div 
              className="absolute border-2 border-yellow-500 bg-yellow-500/30 pointer-events-none"
              style={getDrawingRectStyle()}
            />
            
            {/* Existing regions */}
            {regions.map((region) => (
              <div 
                key={region.id}
                className={`absolute border-2 ${
                  region.isSelected 
                    ? 'border-yellow-500 bg-yellow-500/30' 
                    : 'border-primary bg-primary/30'
                }`}
                style={{
                  left: `${region.x}px`,
                  top: `${region.y}px`,
                  width: `${region.width}px`,
                  height: `${region.height}px`,
                }}
              >
                {/* Region label */}
                <div className={`absolute top-0 left-0 px-1 py-0.5 text-xs ${
                  region.isSelected 
                    ? 'bg-yellow-500 text-yellow-950' 
                    : 'bg-primary text-primary-foreground'
                }`}>
                  {region.name || t('regions.name')}
                </div>
                
                {/* Resize handle (only for selected regions) */}
                {region.isSelected && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-yellow-500 border-2 border-white rounded-sm cursor-se-resize" />
                )}
                
                {/* Region actions */}
                {region.isSelected && (
                  <div className="absolute top-0 right-0 flex space-x-1 p-1">
                    <button 
                      type="button"
                      className="w-5 h-5 flex items-center justify-center bg-white rounded-full text-gray-700 hover:bg-gray-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyRegion(region.id);
                      }}
                      title={t('common.copy')}
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button 
                      type="button"
                      className="w-5 h-5 flex items-center justify-center bg-white rounded-full text-red-600 hover:bg-red-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveRegion(region.id);
                      }}
                      title={t('common.delete')}
                    >
                      <Trash className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Instructions */}
          {isCreating && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/70 text-white px-4 py-2 rounded-md text-sm">
                {t('regions.drawInstructions')}
              </div>
            </div>
          )}
        </div>
        
        {/* Controls */}
        <div className="space-y-4">
          {/* Manual dimensions */}
          <div className="space-y-3 p-3 border rounded-md">
            <h4 className="font-medium text-sm">{t('regions.manualDimensions')}</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="x" className="text-xs">{t('regions.x')}</Label>
                <Input 
                  id="x"
                  type="number"
                  min="0"
                  max={imageSize.width}
                  value={manualDimensions.x}
                  onChange={(e) => setManualDimensions({
                    ...manualDimensions,
                    x: parseInt(e.target.value) || 0
                  })}
                  className="h-8"
                />
              </div>
              <div>
                <Label htmlFor="y" className="text-xs">{t('regions.y')}</Label>
                <Input 
                  id="y"
                  type="number"
                  min="0"
                  max={imageSize.height}
                  value={manualDimensions.y}
                  onChange={(e) => setManualDimensions({
                    ...manualDimensions,
                    y: parseInt(e.target.value) || 0
                  })}
                  className="h-8"
                />
              </div>
              <div>
                <Label htmlFor="width" className="text-xs">{t('regions.width')}</Label>
                <Input 
                  id="width"
                  type="number"
                  min="10"
                  max={imageSize.width}
                  value={manualDimensions.width}
                  onChange={(e) => setManualDimensions({
                    ...manualDimensions,
                    width: parseInt(e.target.value) || 10
                  })}
                  className="h-8"
                />
              </div>
              <div>
                <Label htmlFor="height" className="text-xs">{t('regions.height')}</Label>
                <Input 
                  id="height"
                  type="number"
                  min="10"
                  max={imageSize.height}
                  value={manualDimensions.height}
                  onChange={(e) => setManualDimensions({
                    ...manualDimensions,
                    height: parseInt(e.target.value) || 10
                  })}
                  className="h-8"
                />
              </div>
            </div>
            <Button 
              type="button" 
              size="sm" 
              onClick={handleCreateManualRegion}
              className="w-full"
            >
              {t('regions.createRegion')}
            </Button>
          </div>
          
          {/* Error message */}
          {error && (
            <div className="p-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}
          
          {/* Region name form */}
          {showForm && selectedRegionId && (
            <form onSubmit={handleNameRegion} className="p-3 border rounded-md space-y-3">
              <h4 className="font-medium text-sm">{t('regions.nameRegion')}</h4>
              <div className="space-y-2">
                <Label htmlFor="regionName" className="text-xs">{t('regions.name')}</Label>
                <Input 
                  id="regionName"
                  value={regionName}
                  onChange={(e) => setRegionName(e.target.value)}
                  placeholder={t('regions.namePlaceholder')}
                  className="h-8"
                  autoFocus
                />
              </div>
              
              <div className="flex space-x-2">
                <Button type="submit" size="sm" className="flex-1">{t('common.save')}</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => {
                  setShowForm(false);
                  // If the region is new and has no name, remove it
                  const region = regions.find(r => r.id === selectedRegionId);
                  if (region && !region.name) {
                    handleRemoveRegion(selectedRegionId);
                  }
                }} className="flex-1">{t('common.cancel')}</Button>
              </div>
            </form>
          )}
          
          {/* Regions list */}
          {regions.length > 0 && (
            <div className="p-3 border rounded-md space-y-3">
              <h4 className="font-medium text-sm">{t('regions.definedRegions')} ({regions.length})</h4>
              <div className="max-h-60 overflow-y-auto">
                <ul className="space-y-2">
                  {regions.map((region) => (
                    <li 
                      key={region.id} 
                      className={`flex justify-between items-center p-2 rounded-md cursor-pointer
                                ${region.isSelected ? 'bg-yellow-500/10 border border-yellow-500' : 'bg-background hover:bg-muted'}`}
                      onClick={() => {
                        setRegions(regions.map(r => ({...r, isSelected: r.id === region.id})));
                        setSelectedRegionId(region.id);
                        setRegionName(region.name);
                        if (!region.name) {
                          setShowForm(true);
                        }
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-sm bg-primary"
                          style={{backgroundColor: region.isSelected ? 'rgb(234 179 8)' : ''}}
                        />
                        <span className={`text-sm ${!region.name && 'text-muted-foreground italic'}`}>
                          {region.name || t('regions.name')}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round(region.width)}×{Math.round(region.height)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {/* Finish button */}
          <Button 
            type="button" 
            onClick={handleComplete}
            className="w-full"
            disabled={regions.length === 0 || regions.some(r => !r.name.trim())}
          >
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Original RegionMapper component used elsewhere
interface RegionMapperProps {
  locationId: number;
  imagePath: string;
}

export default function RegionMapperOriginal({ locationId, imagePath }: RegionMapperProps) {
  const { t } = useLanguage();
  // Original implementation continues below...
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Placeholder implementation to prevent errors
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await getLocationRegions(locationId);
        setRegions(data);
      } catch (err) {
        console.error('Error fetching regions:', err);
        setError(t('common.error'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchRegions();
  }, [locationId, t]);

  return (
    <div>
      <h2>{t('regions.title')}</h2>
      {loading ? (
        <p>{t('common.loading')}</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <div>
          <p>{t('regions.count')}: {regions.length}</p>
          <ul>
            {regions.map(region => (
              <li key={region.id}>{region.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
