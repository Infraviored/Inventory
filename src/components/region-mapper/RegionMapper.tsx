"use client";

import React, { useState, useEffect, useRef } from 'react';
import { RegionMapperProps, ActiveRegion, Region, Point } from './types';
import { applySnapping, createNewRegion, getRectangleDimensions } from './utils';
import { RegionForm } from './RegionForm';
import { RegionList } from './RegionList';
import { RegionDisplay } from './RegionDisplay';
import { useLanguage } from '@/lib/language';

export function RegionMapper({ 
  imageSrc, 
  onComplete, 
  initialRegions = [], 
  autoStartDrawing = true 
}: RegionMapperProps) {
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<Point | null>(null);
  const [resizeStartDims, setResizeStartDims] = useState<{width: number, height: number} | null>(null);

  // Drawing state
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const prevRegionsRef = useRef<string>('');

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

  // Update parent component with regions whenever they change
  useEffect(() => {
    // Convert regions to string for comparison
    const regionsString = JSON.stringify(
      regions.map(({ name, x, y, width, height }) => ({ name, x, y, width, height }))
    );
    
    // Only call onComplete if regions have actually changed
    if (regionsString !== prevRegionsRef.current) {
      prevRegionsRef.current = regionsString;
      const formattedRegions: Region[] = regions.map(({ name, x, y, width, height }) => ({
        name, x, y, width, height
      }));
      console.log('Updating parent with regions:', formattedRegions);
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
      const updatedRegions = regions.map(r => ({
        ...r,
        isSelected: r.id === clickedRegion.id,
        isDragging: r.id === clickedRegion.id,
        isResizing: false
      }));
      setRegions(updatedRegions);
      setSelectedRegionId(clickedRegion.id);
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
      const snapped = applySnapping(newX, newY, draggingRegion.width, draggingRegion.height, regions, draggingRegion, imageSize);
      
      // Update region position
      const updatedRegions = regions.map(r => {
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
      });
      
      setRegions(updatedRegions);
      
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
      
      // Update region dimensions
      const updatedRegions = regions.map(r => {
        if (r.id === resizingRegion.id) {
          // Update menu position if this is the selected region
          if (r.id === selectedRegionId && showForm) {
            setMenuPosition({
              x: r.x + boundedWidth + 10,
              y: r.y
            });
          }
          
          return {
            ...r,
            width: boundedWidth,
            height: boundedHeight
          };
        }
        return r;
      });
      
      setRegions(updatedRegions);
    }
  };

  // Handle mouse up (finish drawing or stop drag/resize)
  const handleMouseUp = () => {
    // If we're drawing a new region
    if (isCreating && startPoint && currentPoint) {
      // Calculate region dimensions
      const { x, y, width, height } = getRectangleDimensions(startPoint, currentPoint);
      
      // Only create region if it has a minimum size
      if (width > 10 && height > 10) {
        // Apply snapping
        const snapped = applySnapping(x, y, width, height, regions, null, imageSize);
        
        // Create new region
        const newRegion = createNewRegion(snapped.x, snapped.y, snapped.width, snapped.height);
        
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

  // Handle region naming
  const handleNameRegion = (name: string) => {
    if (!selectedRegionId) {
      console.error('No region selected for naming');
      return;
    }
    
    console.log('Saving region name:', name, 'for region ID:', selectedRegionId);
    
    // Update region name - create a new array to ensure state update
    const updatedRegions = regions.map(r => {
      if (r.id === selectedRegionId) {
        return {
          ...r,
          name: name
        };
      }
      return r;
    });
    
    setRegions(updatedRegions);
    
    // Hide form
    setShowForm(false);
    setError(null);
    setSuccess(t('common.success'));
    
    console.log('Region named successfully:', name);
  };

  // Handle region removal
  const handleRemoveRegion = (id: string) => {
    const updatedRegions = regions.filter(r => r.id !== id);
    setRegions(updatedRegions);
    
    if (selectedRegionId === id) {
      setSelectedRegionId(null);
      setShowForm(false);
    }
  };

  // Handle toggle resize mode
  const handleToggleResize = (id: string) => {
    const updatedRegions = regions.map(r => ({
      ...r,
      isResizing: r.id === id ? !r.isResizing : false,
      isDragging: false
    }));
    setRegions(updatedRegions);
  };

  // Handle toggle drawing mode
  const handleToggleDrawing = () => {
    setIsCreating(!isCreating);
    
    // Deselect all regions when entering drawing mode
    if (!isCreating) {
      setRegions(regions.map(r => ({ ...r, isSelected: false })));
      setSelectedRegionId(null);
      setShowForm(false);
    }
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
          <RegionDisplay 
            key={region.id}
            region={region}
            isSelected={region.isSelected}
            onToggleResize={handleToggleResize}
          />
        ))}
        
        {/* Region naming form - positioned next to the selected region */}
        {showForm && selectedRegionId && (
          <RegionForm
            selectedRegion={regions.find(r => r.id === selectedRegionId) || null}
            onNameRegion={handleNameRegion}
            onCancel={() => {
              setShowForm(false);
              setError(null);
              // If the region is new and has no name, remove it
              const region = regions.find(r => r.id === selectedRegionId);
              if (region && !region.name) {
                handleRemoveRegion(selectedRegionId);
              }
            }}
            position={menuPosition}
            isMobile={isMobile}
          />
        )}
      </div>
      
      {/* Controls */}
      <div className="flex justify-between items-center">
        <Button
          type="button"
          variant={isCreating ? "secondary" : "outline"}
          size="sm"
          onClick={handleToggleDrawing}
        >
          {isCreating ? t('common.done') : t('regions.addNew')}
        </Button>
        
        {error && (
          <div className="text-sm text-red-500 flex items-center">
            <span className="mr-1">⚠️</span> {error}
          </div>
        )}
        
        {success && (
          <div className="text-sm text-green-500 flex items-center">
            <span className="mr-1">✓</span> {success}
          </div>
        )}
      </div>
      
      {/* Region list */}
      <RegionList
        regions={regions}
        onSelectRegion={(id) => {
          const region = regions.find(r => r.id === id);
          if (region) {
            const updatedRegions = regions.map(r => ({
              ...r,
              isSelected: r.id === id
            }));
            setRegions(updatedRegions);
            setSelectedRegionId(id);
            
            // Position the form menu next to the region
            setMenuPosition({
              x: region.x + region.width + 10,
              y: region.y
            });
          }
        }}
        onRemoveRegion={handleRemoveRegion}
      />
    </div>
  );
}
