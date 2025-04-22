"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RegionMapperProps, Region, Point } from './types';
import { applySnapping, createNewRegion, getRectangleDimensions } from './utils';
import { RegionList } from './RegionList';
import { RegionDisplay } from './RegionDisplay';
import { useLanguage } from '@/lib/language';
import { Button } from '@/components/ui/button';

export function RegionMapper({ 
  imageSrc, 
  onComplete, 
  initialRegions = [], 
  autoStartDrawing = false 
}: RegionMapperProps) {
  const { t } = useLanguage();
  
  // --- Local State for Interactions --- 
  const [isCreating, setIsCreating] = useState(autoStartDrawing);
  const [selectedRegionIndex, setSelectedRegionIndex] = useState<number | null>(null);
  const [draggingRegionIndex, setDraggingRegionIndex] = useState<number | null>(null);
  const [resizingRegionIndex, setResizingRegionIndex] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<Point | null>(null);
  const [resizeStartDims, setResizeStartDims] = useState<{width: number, height: number} | null>(null);
  const [regionName, setRegionName] = useState('');

  // Drawing state (remains local)
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const formInteractionRef = useRef(false);

  // Snap guides state
  const [snapGuides, setSnapGuides] = useState<{
    horizontal: number[] | null,
    vertical: number[] | null
  }>({ horizontal: null, vertical: null });

  // --- Removed problematic useEffects --- 

  // --- Existing useEffects (Mobile check, Image dimensions, Success message, Drawing event listener) ---
  // ... (These remain largely unchanged and correct) ...
   useEffect(() => {
    const startDrawingHandler = () => {
      setSelectedRegionIndex(null);
      setDraggingRegionIndex(null); 
      setResizingRegionIndex(null); 
      setShowForm(false);
      setIsCreating(true);
      setStartPoint(null);
      setCurrentPoint(null);
      console.log("[RegionMapper] Event: startDrawingRegion triggered.");
    };
    document.addEventListener('startDrawingRegion', startDrawingHandler);
    return () => {
      document.removeEventListener('startDrawingRegion', startDrawingHandler);
    };
  }, []);

  useEffect(() => { /* Mobile check */ 
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
  }, []);
  useEffect(() => { /* Image dimensions */ 
      if (imageRef.current?.complete) {
          setImageSize({ width: imageRef.current.naturalWidth, height: imageRef.current.naturalHeight });
      }
  }, [imageSrc]);
  useEffect(() => { /* Success message */
      if (success) {
          const timer = setTimeout(() => setSuccess(null), 3000);
          return () => clearTimeout(timer);
      }
   }, [success]);
  const handleImageLoad = () => { /* Handle image load */ 
      if (imageRef.current) {
          setImageSize({ width: imageRef.current.naturalWidth, height: imageRef.current.naturalHeight });
          setError(null);
      }
  };


  // --- Event Handlers (Now call onComplete directly) --- 
  const handleMouseDown = (e: React.MouseEvent) => {
    if (formInteractionRef.current || !containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isCreating) {
      setStartPoint({ x, y });
      setCurrentPoint({ x, y });
      return;
    }

    // Check resize handle click
    if (selectedRegionIndex !== null) {
        const selectedRegion = initialRegions[selectedRegionIndex];
        const handleSize = 30; 
        const handleX = selectedRegion.x + selectedRegion.width - (handleSize / 2);
        const handleY = selectedRegion.y + selectedRegion.height - (handleSize / 2);

        if (x >= handleX - (handleSize/2) && x <= handleX + (handleSize/2) && y >= handleY - (handleSize/2) && y <= handleY + (handleSize/2)) {
            setResizingRegionIndex(selectedRegionIndex);
            setDraggingRegionIndex(null); 
            setResizeStartDims({ width: selectedRegion.width, height: selectedRegion.height });
            setDragStartPos({ x, y }); 
            return;
        }
    }

    // Check region click 
    let clickedIndex: number | null = null;
    for (let i = initialRegions.length - 1; i >= 0; i--) {
      const region = initialRegions[i];
      if (x >= region.x && x <= region.x + region.width && y >= region.y && y <= region.y + region.height) {
        clickedIndex = i;
        break;
      }
    }

    if (clickedIndex !== null) {
      const clickedRegion = initialRegions[clickedIndex];
      setSelectedRegionIndex(clickedIndex);
      setDraggingRegionIndex(clickedIndex); 
      setResizingRegionIndex(null); 
      setDragStartPos({ x, y });
      setMenuPosition({ x: clickedRegion.x + clickedRegion.width + 10, y: clickedRegion.y });
      setRegionName(clickedRegion.name || '');
      setShowForm(true);
    } else {
      setSelectedRegionIndex(null);
      setDraggingRegionIndex(null);
      setResizingRegionIndex(null);
      setShowForm(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || formInteractionRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isCreating && startPoint) {
      setCurrentPoint({ x, y });
      return;
    }

    // Handle dragging
    if (draggingRegionIndex !== null && dragStartPos) {
        const region = initialRegions[draggingRegionIndex];
        const deltaX = x - dragStartPos.x;
        const deltaY = y - dragStartPos.y;
        let newX = Math.max(0, Math.min(region.x + deltaX, imageSize.width - region.width));
        let newY = Math.max(0, Math.min(region.y + deltaY, imageSize.height - region.height));
        const snapped = { x: newX, y: newY }; // Simplified snapping for now
        setSnapGuides({ horizontal: null, vertical: null }); 

        const nextRegions = initialRegions.map((r, index) => 
            index === draggingRegionIndex ? { ...r, x: snapped.x, y: snapped.y } : r
        );
        onComplete(nextRegions);

        if(draggingRegionIndex === selectedRegionIndex) {
            setMenuPosition({ x: snapped.x + region.width + 10, y: snapped.y });
        }
        setDragStartPos({ x, y });
        return; 
    }

    // Handle resizing
    if (resizingRegionIndex !== null && dragStartPos && resizeStartDims) {
        const region = initialRegions[resizingRegionIndex];
        const deltaX = x - dragStartPos.x;
        const deltaY = y - dragStartPos.y;
        let newWidth = Math.max(20, resizeStartDims.width + deltaX);
        let newHeight = Math.max(20, resizeStartDims.height + deltaY);
        newWidth = Math.min(newWidth, imageSize.width - region.x);
        newHeight = Math.min(newHeight, imageSize.height - region.y);

        const nextRegions = initialRegions.map((r, index) =>
            index === resizingRegionIndex ? { ...r, width: newWidth, height: newHeight } : r
        );
        onComplete(nextRegions);
        
        if(resizingRegionIndex === selectedRegionIndex) {
            setMenuPosition({ x: region.x + newWidth + 10, y: region.y });
        }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
     setSnapGuides({ horizontal: null, vertical: null });
    if (formInteractionRef.current) {
      formInteractionRef.current = false;
      return;
    }
    if (!containerRef.current) return;

    // Stop dragging/resizing
    if (draggingRegionIndex !== null || resizingRegionIndex !== null) {
        setDraggingRegionIndex(null);
        setResizingRegionIndex(null);
        setDragStartPos(null);
        setResizeStartDims(null);
        return; 
    }

    // Finalize drawing 
    if (isCreating && startPoint && currentPoint) {
        const rect = containerRef.current.getBoundingClientRect();
        const finalX = e.clientX - rect.left;
        const finalY = e.clientY - rect.top;
        const { x, y, width, height } = getRectangleDimensions(startPoint, { x: finalX, y: finalY });
        
        if (width > 10 && height > 10) { 
            const newRegionData: Region = { name: '', x, y, width, height }; 
            const nextRegions = [...initialRegions, newRegionData];
            onComplete(nextRegions); 
            
            const newIndex = nextRegions.length - 1;
            setSelectedRegionIndex(newIndex);
            setRegionName(''); 
            setMenuPosition({ x: x + width + 10, y: y });
            setShowForm(true); 
            setIsCreating(false);
            document.dispatchEvent(new CustomEvent('drawingComplete', { bubbles: true }));
        } else {
            setIsCreating(false);
            document.dispatchEvent(new CustomEvent('drawingComplete', { bubbles: true }));
        }
        setStartPoint(null);
        setCurrentPoint(null);
    }
  };

  const handleNameRegion = (name: string) => {
    if (selectedRegionIndex === null) return;
    const nextRegions = initialRegions.map((r, index) => 
        index === selectedRegionIndex ? { ...r, name } : r
    );
    onComplete(nextRegions);
    setShowForm(false);
    setSuccess(t('common.success') || 'Saved!');
  };

  const handleRemoveRegion = (indexToRemove: number) => {
    const nextRegions = initialRegions.filter((_, index) => index !== indexToRemove);
    onComplete(nextRegions);
     if (selectedRegionIndex === indexToRemove) {
      setSelectedRegionIndex(null);
      setShowForm(false);
    }
    else if (selectedRegionIndex !== null && indexToRemove < selectedRegionIndex) {
        setSelectedRegionIndex(selectedRegionIndex - 1);
    }
  };
  
  const handleDuplicateRegion = (indexToDuplicate: number) => {
      const regionToDuplicate = initialRegions[indexToDuplicate];
      if (!regionToDuplicate) return;
      const newRegion: Region = {
          name: regionToDuplicate.name ? `${regionToDuplicate.name} (copy)` : 'Copy',
          x: Math.min(regionToDuplicate.x + 20, imageSize.width - regionToDuplicate.width),
          y: Math.min(regionToDuplicate.y + 20, imageSize.height - regionToDuplicate.height),
          width: regionToDuplicate.width,
          height: regionToDuplicate.height
      };
      const nextRegions = [...initialRegions, newRegion];
      onComplete(nextRegions);
      setSelectedRegionIndex(nextRegions.length - 1);
      setMenuPosition({ x: newRegion.x + newRegion.width + 10, y: newRegion.y });
      setRegionName(newRegion.name);
      setShowForm(true);
  };

  const handleToggleResize = (indexToResize: number) => {
       if (resizingRegionIndex === indexToResize) {
          setResizingRegionIndex(null); 
      } else {
          setResizingRegionIndex(indexToResize);
          setDraggingRegionIndex(null); 
          setSelectedRegionIndex(indexToResize); 
          const region = initialRegions[indexToResize];
          setResizeStartDims({ width: region.width, height: region.height });
          setDragStartPos(null); // Might need refinement
      }
  };

  const handleToggleDrawing = () => {
       const nextIsCreating = !isCreating;
    setIsCreating(nextIsCreating);
    if (nextIsCreating) {
      setSelectedRegionIndex(null);
      setShowForm(false);
    } else {
      document.dispatchEvent(new CustomEvent('drawingComplete', { bubbles: true }));
    }
  };

  // --- Rendering --- 
  return (
    <div className="space-y-4">
      {/* Image container */}
      <div 
        ref={containerRef}
        className="relative border border-border rounded-md overflow-hidden dark:border-border cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} 
        style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}
      >
        {/* Image */}
        <img 
          ref={imageRef}
          src={imageSrc} 
          alt={t('regions.locationImage') || "Location image"}
          className="block max-w-full h-auto select-none" // Added block display and select-none
          onLoad={handleImageLoad}
          draggable={false}
          style={{ position: 'relative', zIndex: 1 }}
        />
        
        {/* Drawing overlay */}
        {isCreating && startPoint && currentPoint && (
            <div 
                className="absolute border-2 border-primary bg-primary/30 z-10 dark:bg-primary/20 pointer-events-none"
                style={{
                left: `${Math.min(startPoint.x, currentPoint.x)}px`,
                top: `${Math.min(startPoint.y, currentPoint.y)}px`,
                width: `${Math.abs(currentPoint.x - startPoint.x)}px`,
                height: `${Math.abs(currentPoint.y - startPoint.y)}px`,
                }}
            />
        )}
        
        {/* Existing regions */}
        {initialRegions.map((region, index) => (
          <RegionDisplay 
            key={`region-${index}`} 
            region={region} 
            isSelected={index === selectedRegionIndex}
            isResizing={index === resizingRegionIndex}
            // Pass correct callbacks 
            onToggleResize={() => handleToggleResize(index)} 
            onDuplicate={() => handleDuplicateRegion(index)} 
            onRemove={() => handleRemoveRegion(index)} 
          />
        ))}
        
        {/* Snap guides */}
        {/* ... Snap guide rendering (unchanged) ... */}
        
        {/* Region naming form */}
        {showForm && selectedRegionIndex !== null && (
          <div 
            className="absolute z-30"
            style={{ 
                left: `${menuPosition.x}px`, 
                top: `${menuPosition.y}px`, 
                pointerEvents: 'all' 
            }}
            // Stop propagation for form interactions
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div 
              className="bg-background/80 backdrop-blur-sm border border-border rounded-md shadow-lg p-3 dark:border-border dark:bg-background/70 w-60"
              data-region-form="true" // Keep data attribute
              // Stop propagation
               onClick={(e) => e.stopPropagation()}
               onMouseDown={(e) => e.stopPropagation()}
               onMouseUp={(e) => e.stopPropagation()}
               onMouseMove={(e) => e.stopPropagation()}
            >
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-foreground">{t('regions.nameRegion') || "Name Region"}</h4>
                {/* ... Error display ... */}
                <div className="space-y-2">
                  <input
                    id="region-name" 
                    value={regionName} // Controlled input
                    onChange={(e) => setRegionName(e.target.value)} // Update local state
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleNameRegion(regionName.trim()); // Call handler
                      }
                    }}
                    placeholder={t('regions.namePlaceholder') || "Enter region name"}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:border-border"
                    autoFocus // Keep autoFocus
                    onClick={(e) => e.stopPropagation()} // Stop propagation
                    onMouseDown={(e) => e.stopPropagation()} // Stop propagation
                  />
                </div>
                {/* Save/Cancel Buttons */}
                <div className="flex space-x-2">
                  <Button 
                    type="button" 
                    size="sm" 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNameRegion(regionName.trim()); // Call handler
                    }}
                  >
                    {t('common.save') || "Save"}
                  </Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowForm(false); // Just hide form on cancel
                      setError(null);
                      // Don't auto-remove on cancel anymore
                    }}
                    className="flex-1 dark:border-border dark:hover:bg-muted"
                  >
                    {t('common.cancel') || "Cancel"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Controls Area */}
      <div className="flex justify-between items-center">
        {/* Toggle Drawing Button */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={isCreating ? "secondary" : "outline"}
            size="sm"
            onClick={handleToggleDrawing} // Use handler
          >
            {isCreating ? t('common.done') || "Done" : t('regions.addRegion') || "Add Region"}
          </Button>
        </div>
        {/* Success/Error Messages */}
        {/* ... (unchanged) ... */}
      </div>
      
      {/* Region list (Pass initialRegions and handlers using index) */}
      <RegionList
        // Pass initialRegions directly for display
        regions={initialRegions} 
        // Pass selectedRegionIndex for highlighting
        selectedRegionIndex={selectedRegionIndex}
        // Select handler updates local state
        onSelectRegion={(index) => {
            setSelectedRegionIndex(index);
            // Optionally show form immediately on list selection
            const region = initialRegions[index];
            if(region) {
                 setMenuPosition({ x: region.x + region.width + 10, y: region.y });
                 setRegionName(region.name || '');
                 setShowForm(true);
            }
        }}
        // Remove handler passes index to main handler
        onRemoveRegion={handleRemoveRegion} 
      />
    </div>
  );
}
