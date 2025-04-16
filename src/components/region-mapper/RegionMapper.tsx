"use client";

import React, { useState, useEffect, useRef } from 'react';
import { RegionMapperProps, ActiveRegion, Region, Point } from './types';
import { applySnapping, createNewRegion, getRectangleDimensions } from './utils';
import { RegionForm } from './RegionForm';
import { RegionList } from './RegionList';
import { RegionDisplay } from './RegionDisplay';
import { useLanguage } from '@/lib/language';
import { Button } from '@/components/ui/button';

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

  // Add a ref to track if we're interacting with the form
  const formInteractionRef = useRef(false);

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
    // Check if the click is on the form or its descendants
    const target = e.target as HTMLElement;
    const isFormClick = !!target.closest('[data-region-form="true"]');
    
    if (isFormClick) {
      formInteractionRef.current = true;
      return;
    }
    
    if (!containerRef.current) return;
    
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // If we're in creation mode, start drawing
    if (isCreating) {
      setStartPoint({ x, y });
      setCurrentPoint({ x, y });
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
  const handleMouseUp = (e: React.MouseEvent) => {
    // If we were interacting with the form, reset the flag and don't process this event
    if (formInteractionRef.current) {
      formInteractionRef.current = false;
      return;
    }
    
    if (!containerRef.current) return;

    // Handle dragging release
    const draggedRegions = regions.filter(r => r.isDragging || r.isResizing);
    if (draggedRegions.length > 0) {
      // Do nothing special, just stop dragging or resizing
      setRegions(regions.map(r => ({
        ...r,
        isDragging: false,
        isResizing: false
      })));
      setDragStartPos(null);
      setResizeStartDims(null);
      return;
    }
    
    // If we're in creation mode and have a start point, finalize region creation
    if (isCreating && startPoint && currentPoint) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Update current point to final mouse position
      setCurrentPoint({ x: mouseX, y: mouseY });
      
      // Calculate dimensions
      const { x, y, width, height } = getRectangleDimensions(startPoint, { x: mouseX, y: mouseY });
      
      // Only create regions that are big enough
      if (width > 20 && height > 20) {
        // Generate a unique ID with timestamp to avoid collisions
        const newRegionId = `region-${Date.now()}`;
        console.log(`Creating new region with ID: ${newRegionId}`);
        
        // Create and add the new region
        const newRegion = createNewRegion(x, y, width, height, newRegionId, '');
        
        // Deselect all other regions
        const updatedRegions = regions.map(r => ({ ...r, isSelected: false })).concat(newRegion);
        setRegions(updatedRegions);
        
        // Select the new region
        setSelectedRegionId(newRegionId);
        
        // Position form near the new region
        // Calculate form position - try to keep it within the container
        const containerWidth = containerRef.current.offsetWidth;
        const formX = x + width + 10 < containerWidth - 260 
          ? x + width + 10 
          : Math.max(0, x - 270);
          
        const formY = Math.max(0, y);
        
        setMenuPosition({
          x: formX,
          y: formY
        });
        
        // Show form to name the region
        setShowForm(true);
        
        // Exit creation mode 
        setIsCreating(false);
      } else {
        console.log('Region too small, not creating');
      }
      
      // Reset drawing state
      setStartPoint(null);
      setCurrentPoint(null);
    }
  };

  // Handle region naming
  const handleNameRegion = (name: string) => {
    if (!selectedRegionId) return;
    
    // Find the region to update directly
    const updatedRegions = regions.map(r => {
      if (r.id === selectedRegionId) {
        return { ...r, name };
      }
      return r;
    });
    
    // Update regions with the new array
    setRegions(updatedRegions);
    
    // Directly call onComplete with formatted regions to ensure parent update
    const formattedRegions = updatedRegions.map(({ name, x, y, width, height }) => ({
      name, x, y, width, height
    }));
    onComplete(formattedRegions);
    
    // Show success
    setShowForm(false);
    setError(null);
    setSuccess(t('common.success'));
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

  // Add a function to duplicate a region
  const handleDuplicateRegion = (id: string) => {
    const regionToDuplicate = regions.find(r => r.id === id);
    if (!regionToDuplicate) return;
    
    // Create a new region with offset position
    const newRegionId = `region-${Date.now()}`;
    const newRegion = createNewRegion(
      regionToDuplicate.x + 20, 
      regionToDuplicate.y + 20, 
      regionToDuplicate.width, 
      regionToDuplicate.height,
      newRegionId,
      regionToDuplicate.name ? `${regionToDuplicate.name} (copy)` : ''
    );
    
    // Add new region and select it
    const updatedRegions = regions.map(r => ({ ...r, isSelected: false })).concat(newRegion);
    setRegions(updatedRegions);
    setSelectedRegionId(newRegionId);
    
    // Position form next to new region
    setMenuPosition({
      x: newRegion.x + newRegion.width + 10,
      y: newRegion.y
    });
  };

  return (
    <div className="space-y-4">
      {/* Image container with fixed dimensions */}
      <div 
        ref={containerRef}
        className="relative border border-border rounded-md overflow-hidden dark:border-border"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ 
          position: 'relative',
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      >
        {/* Image */}
        <img 
          ref={imageRef}
          src={imageSrc} 
          alt={t('regions.locationImage') || "Location image"}
          className="max-w-full h-auto"
          onLoad={handleImageLoad}
          draggable={false}
          style={{ position: 'relative', zIndex: 1 }}
        />
        
        {/* Drawing overlay */}
        {isCreating && startPoint && currentPoint && (
          <div 
            className="absolute border-2 border-primary bg-primary/30 z-10 dark:bg-primary/20"
            style={{
              left: `${Math.min(startPoint.x, currentPoint.x)}px`,
              top: `${Math.min(startPoint.y, currentPoint.y)}px`,
              width: `${Math.abs(currentPoint.x - startPoint.x)}px`,
              height: `${Math.abs(currentPoint.y - startPoint.y)}px`,
              pointerEvents: 'none'
            }}
          />
        )}
        
        {/* Existing regions */}
        {regions.length > 0 && regions.map((region) => (
          <RegionDisplay 
            key={region.id}
            region={region}
            isSelected={region.isSelected}
            onToggleResize={handleToggleResize}
            onDuplicate={handleDuplicateRegion}
            onRemove={handleRemoveRegion}
          />
        ))}
        
        {/* Region naming form - positioned next to the selected region */}
        {showForm && selectedRegionId && (
          <div 
            className="absolute z-30"
            style={{
              left: `${menuPosition.x}px`,
              top: `${menuPosition.y}px`,
              pointerEvents: 'all'
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
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
              position={{ x: 0, y: 0 }} // Position is now handled by the wrapper
              isMobile={isMobile}
            />
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={isCreating ? "secondary" : "outline"}
            size="sm"
            onClick={handleToggleDrawing}
          >
            {isCreating ? t('common.done') || "Done" : t('regions.addNew') || "Add Region"}
          </Button>
        </div>
        
        {error && (
          <div className="text-sm text-destructive flex items-center dark:text-red-400">
            <span className="mr-1">⚠️</span> {error}
          </div>
        )}
        
        {success && (
          <div className="text-sm text-emerald-600 flex items-center dark:text-emerald-400">
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
