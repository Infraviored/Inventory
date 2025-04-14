"use client";

import { useState, useEffect, useRef } from 'react';
import { getLocationRegions, addLocationRegion, Region } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Move, Square, Trash, Plus, AlertCircle, Info } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useLanguage } from '@/lib/language';

// This is the component used by location-form.tsx
interface RegionMapperFormProps {
  imageSrc: string;
  onComplete: (regions: Array<{name: string, x: number, y: number, width: number, height: number}>) => void;
  initialRegions?: Array<{name: string, x: number, y: number, width: number, height: number}>;
  autoStartDrawing?: boolean;
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

// Snap threshold in pixels - increased for stronger magnetic effect
const SNAP_THRESHOLD = 10;

export function RegionMapper({ imageSrc, onComplete, initialRegions = [], autoStartDrawing = true }: RegionMapperFormProps) {
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
  const [isCreating, setIsCreating] = useState(autoStartDrawing);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [regionName, setRegionName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [manualDimensions, setManualDimensions] = useState({
    x: 10,
    y: 10,
    width: 100,
    height: 100
  });
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{x: number, y: number} | null>(null);
  const [resizeStartDims, setResizeStartDims] = useState<{width: number, height: number} | null>(null);

  // Drawing state
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{x: number, y: number} | null>(null);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

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
      
      // Reset any previous errors
      setError(null);
    }
  };

  // Find snap positions based on other regions - enhanced with more snap points
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
  };

  // Find nearest snap position - improved with stronger magnetic effect
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

  // Update parent component with regions whenever they change
  // But use a ref to track previous regions to prevent unnecessary updates
  const prevRegionsRef = useRef<string>('');
  
  useEffect(() => {
    // Convert regions to string for comparison
    const regionsString = JSON.stringify(
      regions.map(({ name, x, y, width, height }) => ({ name, x, y, width, height }))
    );
    
    // Only call onComplete if regions have actually changed
    if (regionsString !== prevRegionsRef.current) {
      prevRegionsRef.current = regionsString;
      const formattedRegions = regions.map(({ name, x, y, width, height }) => ({
        name, x, y, width, height
      }));
      onComplete(formattedRegions);
    }
  }, [regions, onComplete]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Update regionName when selectedRegionId changes
  useEffect(() => {
    if (selectedRegionId) {
      const selectedRegion = regions.find(r => r.id === selectedRegionId);
      if (selectedRegion) {
        setRegionName(selectedRegion.name);
      }
    } else {
      setRegionName('');
    }
  }, [selectedRegionId, regions]);

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
      // Make the resize handle larger and more precise
      const resizeHandleRect = {
        x: selectedRegion.x + selectedRegion.width - 20,
        y: selectedRegion.y + selectedRegion.height - 20,
        width: 30,
        height: 30
      };
      
      if (
        x >= resizeHandleRect.x && 
        x <= resizeHandleRect.x + resizeHandleRect.width && 
        y >= resizeHandleRect.y && 
        y <= resizeHandleRect.y + resizeHandleRect.height
      ) {
        // Clicked on resize handle - ONLY resize, never drag
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
      
      // Position the form menu next to the region
      setMenuPosition({
        x: clickedRegion.x + clickedRegion.width + 10,
        y: clickedRegion.y
      });
      
      // Show form if region is unnamed
      if (!clickedRegion.name) {
        setShowForm(true);
      }
    } else {
      // Clicked outside any region, deselect all
      setRegions(regions.map(r => ({ ...r, isSelected: false, isDragging: false, isResizing: false })));
      setSelectedRegionId(null);
      setShowForm(false);
    }
  };

  // Handle touch start for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current || e.touches.length !== 1) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    
    // Similar logic to handleMouseDown
    if (isCreating) {
      setStartPoint({ x, y });
      setCurrentPoint({ x, y });
      return;
    }
    
    // Check if we touched a region
    const touchedRegion = regions.find(region => 
      x >= region.x && 
      x <= (region.x + region.width) && 
      y >= region.y && 
      y <= (region.y + region.height)
    );
    
    if (touchedRegion) {
      setRegions(regions.map(r => ({
        ...r,
        isSelected: r.id === touchedRegion.id,
        isDragging: r.id === touchedRegion.id,
        isResizing: false
      })));
      setSelectedRegionId(touchedRegion.id);
      setRegionName(touchedRegion.name);
      setDragStartPos({ x, y });
      
      // Position the form menu next to the region
      setMenuPosition({
        x: touchedRegion.x + touchedRegion.width + 10,
        y: touchedRegion.y
      });
      
      if (!touchedRegion.name) {
        setShowForm(true);
      }
    } else {
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
          // Update menu position if this is the selected region
          if (r.id === selectedRegionId && showForm) {
            setMenuPosition({
              x: snapped.x + r.width + 10,
              y: snapped.y
            });
          }
          
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
      
      // Visual feedback for snapping - add a flash effect or highlight when snapping occurs
      const isSnappingRight = snapRight !== null;
      const isSnappingBottom = snapBottom !== null;
      
      const finalWidth = isSnappingRight ? snapRight - resizingRegion.x : boundedWidth;
      const finalHeight = isSnappingBottom ? snapBottom - resizingRegion.y : boundedHeight;
      
      // Update region dimensions
      setRegions(regions.map(r => {
        if (r.id === resizingRegion.id) {
          // Update menu position if this is the selected region
          if (r.id === selectedRegionId && showForm) {
            setMenuPosition({
              x: r.x + finalWidth + 10,
              y: r.y
            });
          }
          
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

  // Handle touch move for mobile devices
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current || e.touches.length !== 1) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    
    // Similar logic to handleMouseMove
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
  };

  // Handle mouse up (finish drawing or stop drag/resize)
  const handleMouseUp = () => {
    // If we're drawing a new region
    if (isCreating && startPoint && currentPoint) {
      // Calculate region dimensions
      const x = Math.min(startPoint.x, currentPoint.x);
      const y = Math.min(startPoint.y, currentPoint.y);
      const width = Math.abs(currentPoint.x - startPoint.x);
      const height = Math.abs(currentPoint.y - startPoint.y);
      
      // Only create region if it has a minimum size
      if (width > 10 && height > 10) {
        // Apply snapping
        const snapped = applySnapping(x, y, width, height, null);
        
        // Create new region
        const newRegion: ActiveRegion = {
          id: `region-${Date.now()}`,
          x: snapped.x,
          y: snapped.y,
          width: snapped.width,
          height: snapped.height,
          name: '',
          isSelected: true,
          isResizing: false,
          isDragging: false
        };
        
        console.log('Region drawing finished:', newRegion);
        
        // Add new region to list - create a new array to ensure state update
        const updatedRegions = [...regions.map(r => ({ ...r, isSelected: false })), newRegion];
        setRegions(updatedRegions);
        setSelectedRegionId(newRegion.id);
        
        // Position the form menu next to the region
        setMenuPosition({
          x: newRegion.x + newRegion.width + 10,
          y: newRegion.y
        });
        
        // Show form to name the region
        setShowForm(true);
        
        // Exit creation mode if not in duplicate mode
        setIsCreating(false);
      } else {
        console.log('Region too small, not creating');
      }
      
      // Reset drawing state
      setStartPoint(null);
      setCurrentPoint(null);
    }
    
    // Stop dragging/resizing
    setRegions(regions.map(r => ({
      ...r,
      isDragging: false,
      isResizing: false
    })));
    
    setDragStartPos(null);
    setResizeStartDims(null);
  };

  // Handle touch end for mobile devices
  const handleTouchEnd = () => {
    // Similar logic to handleMouseUp
    handleMouseUp();
  };

  // Handle region naming
  const handleNameRegion = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedRegionId) {
      console.error('No region selected for naming');
      return;
    }
    
    if (!regionName.trim()) {
      setError(t('regions.allRegionsNeedNames'));
      return;
    }
    
    console.log('Saving region name:', regionName, 'for region ID:', selectedRegionId);
    
    // Update region name - create a new array to ensure state update
    const updatedRegions = regions.map(r => {
      if (r.id === selectedRegionId) {
        return {
          ...r,
          name: regionName.trim()
        };
      }
      return r;
    });
    
    setRegions(updatedRegions);
    
    // Hide form
    setShowForm(false);
    setError(null);
    setSuccess(t('common.success'));
    
    console.log('Region named successfully:', regionName);
  };

  // Handle region removal
  const handleRemoveRegion = (id: string) => {
    setRegions(regions.filter(r => r.id !== id));
    
    if (selectedRegionId === id) {
      setSelectedRegionId(null);
      setShowForm(false);
    }
  };

  // Handle toggle resize mode
  const handleToggleResize = (id: string) => {
    setRegions(regions.map(r => ({
      ...r,
      isResizing: r.id === id ? !r.isResizing : false,
      isDragging: false
    })));
  };

  // Get form position
  const getFormPosition = () => {
    if (!selectedRegionId) return {};
    
    const region = regions.find(r => r.id === selectedRegionId);
    if (!region) return {};
    
    // Position form next to region
    let x = menuPosition.x;
    let y = menuPosition.y;
    
    // Adjust position if it would go off-screen
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      
      // Form width (approximate)
      const formWidth = isMobile ? containerRect.width : 240;
      
      // Check if form would go off right edge
      if (x + formWidth > containerRect.width) {
        // Position to the left of the region instead
        x = Math.max(0, region.x - formWidth - 10);
      }
      
      // Check if form would go off bottom edge
      if (y + 200 > containerRect.height) {
        // Position above the region instead
        y = Math.max(0, containerRect.height - 200);
      }
    }
    
    return {
      left: `${x}px`,
      top: `${y}px`
    };
  };

  // Calculate the current rectangle dimensions
  const getRectangleDimensions = () => {
    if (!startPoint || !currentPoint) return null;
    
    return {
      x: Math.min(startPoint.x, currentPoint.x),
      y: Math.min(startPoint.y, currentPoint.y),
      width: Math.abs(currentPoint.x - startPoint.x),
      height: Math.abs(currentPoint.y - startPoint.y)
    };
  };

  // Create a new region with manual dimensions
  const handleCreateManualRegion = () => {
    // Ensure dimensions are within image bounds
    const x = Math.max(0, Math.min(manualDimensions.x, imageSize.width - 20));
    const y = Math.max(0, Math.min(manualDimensions.y, imageSize.height - 20));
    const width = Math.max(20, Math.min(manualDimensions.width, imageSize.width - x));
    const height = Math.max(20, Math.min(manualDimensions.height, imageSize.height - y));
    
    // Apply snapping
    const snapped = applySnapping(x, y, width, height, null);
    
    // Create new region
    const newRegion: ActiveRegion = {
      id: `region-${Date.now()}`,
      x: snapped.x,
      y: snapped.y,
      width: snapped.width,
      height: snapped.height,
      name: '',
      isSelected: true,
      isResizing: false,
      isDragging: false
    };
    
    console.log('Manual region created:', newRegion);
    
    // Add new region to list - create a new array to ensure state update
    const updatedRegions = [...regions.map(r => ({ ...r, isSelected: false })), newRegion];
    setRegions(updatedRegions);
    setSelectedRegionId(newRegion.id);
    
    // Position the form menu next to the region
    setMenuPosition({
      x: newRegion.x + newRegion.width + 10,
      y: newRegion.y
    });
    
    // Show form to name the region
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      {/* Image container */}
      <div 
        ref={containerRef}
        className="relative border rounded-md overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Image */}
        <img 
          ref={imageRef}
          src={imageSrc} 
          alt={t('regions.locationImage')}
          className="max-w-full h-auto"
          onLoad={handleImageLoad}
          draggable={false}
        />
        
        {/* Drawing overlay */}
        {isCreating && startPoint && currentPoint && (
          <div 
            className="absolute border-2 border-primary bg-primary/30"
            style={{
              left: `${Math.min(startPoint.x, currentPoint.x)}px`,
              top: `${Math.min(startPoint.y, currentPoint.y)}px`,
              width: `${Math.abs(currentPoint.x - startPoint.x)}px`,
              height: `${Math.abs(currentPoint.y - startPoint.y)}px`,
            }}
          />
        )}
        
        {/* Existing regions */}
        {regions.map((region) => (
          <div 
            key={region.id}
            className={`absolute border-2 ${region.isSelected ? 'border-yellow-500' : 'border-primary'} ${region.isSelected ? 'bg-yellow-500/30' : 'bg-primary/30'}`}
            style={{
              left: `${region.x}px`,
              top: `${region.y}px`,
              width: `${region.width}px`,
              height: `${region.height}px`,
            }}
          >
            {/* Region name label */}
            <div className={`absolute top-0 left-0 px-1 py-0.5 text-xs ${region.isSelected ? 'bg-yellow-500' : 'bg-primary'} text-primary-foreground`}>
              {region.name || t('regions.unnamed')}
            </div>
            
            {/* Region dimensions label */}
            <div className="absolute bottom-0 right-0 px-1 py-0.5 text-xs bg-background/80 text-foreground">
              {Math.round(region.width)}×{Math.round(region.height)}
            </div>
            
            {/* Resize handle */}
            {region.isSelected && (
              <div 
                className="absolute bottom-0 right-0 w-4 h-4 bg-yellow-500 border border-background rounded-sm cursor-se-resize"
                style={{
                  transform: 'translate(50%, 50%)'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleResize(region.id);
                }}
              />
            )}
          </div>
        ))}
        
        {/* Region naming form - positioned next to the selected region */}
        {showForm && selectedRegionId && (
          <div 
            ref={formRef}
            className={`absolute z-10 bg-background border rounded-md shadow-md p-3 ${isMobile ? 'w-full' : 'w-60'}`}
            style={getFormPosition()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3">
              <h4 className="font-medium text-sm">{t('regions.nameRegion')}</h4>
              {error && (
                <div className="p-2 bg-red-100 text-red-700 rounded-md text-xs">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="region-name" className="text-xs">{t('regions.name')}</Label>
                <Input
                  id="region-name"
                  value={regionName}
                  onChange={(e) => setRegionName(e.target.value)}
                  placeholder={t('regions.enterName')}
                  required
                  className="h-8"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    // Prevent Enter key from submitting the form and closing the region mapper
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleNameRegion(e);
                    }
                  }}
                />
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  type="button" 
                  size="sm" 
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNameRegion(e);
                  }}
                >
                  {t('common.save')}
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowForm(false);
                    setError(null);
                    // If the region is new and has no name, remove it
                    const region = regions.find(r => r.id === selectedRegionId);
                    if (region && !region.name) {
                      handleRemoveRegion(selectedRegionId);
                    }
                  }} 
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Region list - shown below the image */}
      {regions.length > 0 && (
        <div className="mt-4 p-3 border rounded-md space-y-3">
          <h4 className="font-medium text-sm">{t('regions.definedRegions')} ({regions.length})</h4>
          <div className="max-h-40 overflow-y-auto">
            <ul className="space-y-2">
              {regions.map((region) => (
                <li 
                  key={region.id} 
                  className={`flex justify-between items-center p-2 rounded-md cursor-pointer
                            ${region.isSelected ? 'bg-yellow-500/10 border border-yellow-500' : 'bg-background hover:bg-muted'}`}
                  onClick={() => {
                    setRegions(regions.map(r => ({...r, isSelected: r.id === region.id})));
                    setSelectedRegionId(region.id);
                    
                    // Position the form menu next to the region
                    setMenuPosition({
                      x: region.x + region.width + 10,
                      y: region.y
                    });
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 bg-primary"
                      style={{
                        aspectRatio: `${region.width} / ${region.height}`
                      }}
                    />
                    <span>{region.name || t('regions.unnamed')}</span>
                  </div>
                  <div className="flex space-x-1">
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRegions(regions.map(r => ({...r, isSelected: r.id === region.id})));
                        setSelectedRegionId(region.id);
                        setShowForm(true);
                        
                        // Position the form menu next to the region
                        setMenuPosition({
                          x: region.x + region.width + 10,
                          y: region.y
                        });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveRegion(region.id);
                      }}
                    >
                      <Trash className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <Button 
          type="button" 
          size="sm" 
          variant={isCreating ? "secondary" : "outline"}
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center space-x-1"
        >
          <Square className="h-4 w-4 mr-1" />
          {isCreating ? t('regions.drawing') : t('regions.draw')}
        </Button>
      </div>
      
      {/* Success message */}
      {success && (
        <div className="p-2 bg-green-100 text-green-700 rounded-md text-sm">
          {success}
        </div>
      )}
    </div>
  );
}
