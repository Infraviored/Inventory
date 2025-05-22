"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { RegionMapperProps, Region, Point, MagnetismConfig, MagnetismType } from './types';
import { createNewRegion, applySnapping } from './utils';
import { RegionList } from './RegionList';
import { RegionDisplay } from './RegionDisplay';
import { useLanguage } from '@/lib/language';
import { Button } from '@/components/ui/button';
import { SettingsIcon, PlusIcon, XIcon } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ColorPickerPopover } from '@/components/ui/color-picker-popover';

// --- Updated State Interfaces ---
interface ActiveRegion extends Region { // Still store natural coords as source of truth
  id: string;
  isSelected: boolean;
  isResizing: boolean;
  isDragging: boolean;
  // Store display coordinates for interaction & rendering
  displayX: number;
  displayY: number;
  displayWidth: number;
  displayHeight: number;
}

// --- Custom Hook for Coordinate Conversion & Info ---
function useImageDisplayCoordinates(
  containerRef: React.RefObject<HTMLDivElement>,
  imageSize: { width: number; height: number }
) {
  const getScaleOffset = useCallback(() => {
    if (!containerRef.current || !imageSize.width || !imageSize.height) {
      return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, renderedWidth: 0, renderedHeight: 0 };
    }
    const rect = containerRef.current.getBoundingClientRect();
    const containerAspect = rect.width / rect.height;
    const imageAspect = imageSize.width / imageSize.height;
    let renderedWidth, renderedHeight, offsetX, offsetY;

    if (imageAspect > containerAspect) {
      renderedWidth = rect.width;
      renderedHeight = rect.width / imageAspect;
      offsetX = 0;
      offsetY = (rect.height - renderedHeight) / 2;
    } else {
      renderedHeight = rect.height;
      renderedWidth = rect.height * imageAspect;
      offsetY = 0;
      offsetX = (rect.width - renderedWidth) / 2;
    }

    const scaleX = renderedWidth > 0 ? imageSize.width / renderedWidth : 1; // Inverse scale: display -> natural
    const scaleY = renderedHeight > 0 ? imageSize.height / renderedHeight : 1;

    return { scaleX, scaleY, offsetX, offsetY, renderedWidth, renderedHeight };

  }, [containerRef, imageSize.width, imageSize.height]);

  const getDisplayCoords = useCallback((event: React.MouseEvent | React.TouchEvent): Point | null => {
    if (!containerRef.current) return null;
    const coords = 'touches' in event ? event.touches[0] : event;
    const rect = containerRef.current.getBoundingClientRect();
    // Return coordinates relative to the container's top-left corner
    const x = coords.clientX - rect.left;
    const y = coords.clientY - rect.top;
    // Clamp to container bounds
    const clampedX = Math.max(0, Math.min(x, rect.width));
    const clampedY = Math.max(0, Math.min(y, rect.height));
    return { x: clampedX, y: clampedY };
  }, [containerRef]);

  // Convert natural image rect {x,y,w,h} to display rect {x,y,w,h}
  // Accepts coordinate object, doesn't need full Region
  const naturalToDisplayRect = useCallback((coords: { x: number; y: number; width: number; height: number; }): Pick<ActiveRegion, 'displayX' | 'displayY' | 'displayWidth' | 'displayHeight'> => {
    const { scaleX, scaleY, offsetX, offsetY } = getScaleOffset();
    // Inverse scale: natural -> display
    const displayScaleX = scaleX !== 0 ? 1 / scaleX : 1;
    const displayScaleY = scaleY !== 0 ? 1 / scaleY : 1;
    
    const displayX = (coords.x * displayScaleX) + offsetX;
    const displayY = (coords.y * displayScaleY) + offsetY;
    const displayWidth = coords.width * displayScaleX;
    const displayHeight = coords.height * displayScaleY;
    return { displayX, displayY, displayWidth, displayHeight };
  }, [getScaleOffset]);

  // Convert display rect {x,y,w,h} to natural image rect {x,y,w,h}
  // Accepts display coordinate object, returns natural coordinate object
  const displayToNaturalRect = useCallback((displayCoords: Pick<ActiveRegion, 'displayX' | 'displayY' | 'displayWidth' | 'displayHeight'>): Omit<Region, 'name'> => {
      const { scaleX, scaleY, offsetX, offsetY } = getScaleOffset(); // scaleX/Y here are display -> natural
      const x = (displayCoords.displayX - offsetX) * scaleX;
      const y = (displayCoords.displayY - offsetY) * scaleY;
      const width = displayCoords.displayWidth * scaleX;
      const height = displayCoords.displayHeight * scaleY;
      // Clamp to natural image bounds (0,0) to (imageSize.width, imageSize.height)
      const clampedX = Math.max(0, Math.min(x, imageSize.width));
      const clampedY = Math.max(0, Math.min(y, imageSize.height));
      const clampedWidth = Math.max(0, Math.min(width, imageSize.width - clampedX));
      const clampedHeight = Math.max(0, Math.min(height, imageSize.height - clampedY));

      return { x: clampedX, y: clampedY, width: clampedWidth, height: clampedHeight };
  }, [getScaleOffset, imageSize.width, imageSize.height]);


  return { getScaleOffset, getDisplayCoords, naturalToDisplayRect, displayToNaturalRect };
}


export function RegionMapper({ 
  imageSrc, 
  onComplete, 
  initialRegions = [], 
  autoStartDrawing = false 
}: RegionMapperProps) {
  const { t } = useLanguage();
  
  const [activeRegions, setActiveRegions] = useState<ActiveRegion[]>([]);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null); // Keep success/error messages

  const finalImageSrc = useMemo(() => {
    if (!imageSrc) return null;
    if (imageSrc.startsWith('http') || imageSrc.startsWith('blob:') || imageSrc.startsWith('/')) {
        return imageSrc; // Assume full URL, blob, or already correct API path
    }
    // Assume category/filename.ext format
    const parts = imageSrc.split('/');
    if (parts.length === 2 && parts[0] && parts[1]) {
        return `/api/images/${imageSrc}`;
    }
    console.warn(`[RegionMapper] Unexpected imageSrc format: ${imageSrc}. May not load.`);
    return imageSrc; // Fallback, might be incorrect
  }, [imageSrc]);

  // Interaction State (using display coordinates where applicable)
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [draggingRegionId, setDraggingRegionId] = useState<string | null>(null);
  const [resizingRegionId, setResizingRegionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(autoStartDrawing);
  const [startPoint, setStartPoint] = useState<Point | null>(null); // Display coordinates
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null); // Display coordinates
  const [dragStartOffset, setDragStartOffset] = useState<Point | null>(null); // Offset within region, display coords
  const [resizeStartPoint, setResizeStartPoint] = useState<Point | null>(null); // Mouse start for resize, display coords
  const [resizeStartDims, setResizeStartDims] = useState<{ displayWidth: number; displayHeight: number } | null>(null); // Region display dims at resize start

  // UI State
  const [showForm, setShowForm] = useState(false);
  const [regionName, setRegionName] = useState('');
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 }); // Popover position, display coords

  // --- Restore Magnetism/Snapping State ---
  const [snapGuides, setSnapGuides] = useState<{
    horizontal: number[] | null, // Store natural coordinates
    vertical: number[] | null   // Store natural coordinates
  }>({ horizontal: null, vertical: null });
  const [magnetismType, setMagnetismType] = useState<MagnetismType>('edges');
  const [magnetismDistance, setMagnetismDistance] = useState<number>(5); // Natural pixels distance
  const [settingsAnchorEl, setSettingsAnchorEl] = useState<HTMLButtonElement | null>(null);
  // --- End Magnetism/Snapping State ---
  
  // --- NEW: Region Border Styling State ---
  const [defaultBorderColor, setDefaultBorderColor] = useState<string>('#d1d5db'); // Default gray-300 (light grey)
  const [selectedBorderColor, setSelectedBorderColor] = useState<string>('#f59e0b'); // Default amber-500
  const [borderWidth, setBorderWidth] = useState<number>(3); // Single width state
  // --- End Border Styling State ---

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null); // Keep ref if needed for direct access, maybe remove
  const formInteractionRef = useRef(false);

  // Hook Instantiation
  const { getScaleOffset, getDisplayCoords, naturalToDisplayRect, displayToNaturalRect } = useImageDisplayCoordinates(containerRef, imageSize);

  // Utility Functions
  const findRegionById = useCallback((id: string | null): ActiveRegion | undefined => {
    return activeRegions.find(r => r.id === id);
  }, [activeRegions]);

  // --- Utility function to calculate Popover position ---
  const calculatePopoverPosition = (region: ActiveRegion): Point => {
    if (!containerRef.current) {
      // Fallback if container ref is not available
      return { x: region.displayX + region.displayWidth + 10, y: region.displayY };
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const popoverWidth = 250; // Approximate width of the popover (w-60 is 240px + padding/border)
    const defaultRightX = region.displayX + region.displayWidth + 10; // Default position to the right
    const positionLeftX = region.displayX - popoverWidth - 10; // Position to the left

    let finalX = defaultRightX;

    // Check if default position goes outside the container width
    if (defaultRightX + popoverWidth > containerRect.width) {
        // Check if positioning to the left is better (fits within container)
        if (positionLeftX >= 0) {
            finalX = positionLeftX;
        }
        // If neither right nor left fit well, stick to the default right 
        // (it might get clipped, but avoids overlapping the region itself)
    }
    
    // Ensure Y position doesn't start above the container 
    const finalY = Math.max(0, region.displayY);

    return { x: finalX, y: finalY };
  };

  // Handle interaction end and call onComplete with NATURAL coordinates
  const handleInteractionEnd = useCallback((regionsToSave: ActiveRegion[]) => {
    // Use the provided regionsToSave array directly
    const regionsToComplete: Region[] = regionsToSave.map(ar => {
      // Convert final display coords back to natural for saving
      const naturalCoords = displayToNaturalRect(ar); 
      return {
        ...naturalCoords, // x, y, width, height
        name: ar.name, // Keep name
      };
    });
    onComplete(regionsToComplete);

    // Reset interaction states
    setActiveRegions(currentRegions => currentRegions.map(r => ({ ...r, isDragging: false, isResizing: false })));
    setDraggingRegionId(null);
    setResizingRegionId(null);
    setDragStartOffset(null);
    setResizeStartPoint(null);
    setResizeStartDims(null);
    setSnapGuides({ horizontal: null, vertical: null }); // Clear guides on interaction end

  }, [activeRegions, displayToNaturalRect, onComplete]); // Add dependencies
  
  // --- useEffects ---
  // Effect to load image dimensions (mostly unchanged)
  useEffect(() => {
    console.log('Image Load Effect: Running. imageSrc:', finalImageSrc);
    setImageSize({ width: 0, height: 0 }); 
    setError(null);
    setActiveRegions([]); // Clear regions when image changes
    setSelectedRegionId(null);
    setDraggingRegionId(null);
    setResizingRegionId(null);
    setShowForm(false);
    setStartPoint(null);
    setCurrentPoint(null);

    if (!finalImageSrc) {
      console.log('Image Load Effect: No finalImageSrc provided.');
      return; 
    }

    let isCancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!isCancelled) {
        console.log(`Image Load Effect: Natural dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
          setError(null);
          // Initial regions will be processed in the next effect
        } else {
          setError(t('regions.imageLoadError') || 'Error loading image data.');
        }
      }
    };
    img.onerror = () => {
      if (!isCancelled) {
        console.error('Image Load Effect: Error loading image.');
        setError(t('regions.imageLoadError') || 'Error loading image data.');
      }
    };
    img.src = finalImageSrc;

    return () => {
      isCancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [finalImageSrc, t]);

  // Effect to process initialRegions or image size changes
  useEffect(() => {
    // Needs imageSize to calculate display coords
    if (!imageSize.width || !imageSize.height) return;
    // console.log('Region Init/Resize Effect: Rebuilding activeRegions from initialRegions, preserving state.');

    // Get the previous state to preserve interaction flags
    const prevActiveRegions = activeRegionsRef.current;

    const nextActiveRegions = initialRegions.map((r, index) => {
        const displayCoords = naturalToDisplayRect(r);
        // Create a base ID (might be temporary if source region has a real ID)
        const baseId = `region-${index}-${Date.now()}`;
        // Find existing region in the *previous* state using source ID if available, or baseId as fallback
        // Explicitly check if 'id' exists and is a string on the incoming region 'r'
        const sourceHasStringId = typeof (r as any)?.id === 'string' && (r as any).id;
        const sourceId = sourceHasStringId ? (r as any).id : baseId;
        const existingRegion = prevActiveRegions.find(ar => ar.id === sourceId);
        
        return {
          ...r, // Natural coords + name from initialRegions
          ...displayCoords, // Calculated display coords
          id: sourceId, // Use source ID if available, otherwise generated
          // Preserve state if found, otherwise default to false
          isSelected: existingRegion?.isSelected ?? false, 
          isResizing: existingRegion?.isResizing ?? false,
          isDragging: existingRegion?.isDragging ?? false,
        };
      });

    setActiveRegions(nextActiveRegions);

  }, [initialRegions, imageSize, naturalToDisplayRect]); // Depends on props/size

  // --- Ref to store previous activeRegions for state preservation --- 
  const activeRegionsRef = useRef<ActiveRegion[]>(activeRegions);
  useEffect(() => {
      activeRegionsRef.current = activeRegions;
  }, [activeRegions]);

   // --- Window Resize Listener Effect ---
   useEffect(() => {
       // Debounce function (keep)
       const debounce = <F extends (...args: any[]) => any>(
           func: F,
           waitFor: number
       ) => {
           let timeoutId: ReturnType<typeof setTimeout> | null = null;
           return (...args: Parameters<F>): void => {
               if (timeoutId !== null) {
                   clearTimeout(timeoutId);
               }
               timeoutId = setTimeout(() => func(...args), waitFor);
           };
       };

       // Handler function (keep, includes tolerance check)
       const handleResize = () => {
           console.log("Window resize detected, debounced recalculation triggered.");
           const tolerance = 0.01; 
           setActiveRegions(currentRegions =>
               currentRegions.map(r => {
                   const newDisplayCoords = naturalToDisplayRect(r); 
                   const changed = 
                       Math.abs(r.displayX - newDisplayCoords.displayX) > tolerance ||
                       Math.abs(r.displayY - newDisplayCoords.displayY) > tolerance ||
                       Math.abs(r.displayWidth - newDisplayCoords.displayWidth) > tolerance ||
                       Math.abs(r.displayHeight - newDisplayCoords.displayHeight) > tolerance;
                   return changed ? { ...r, ...newDisplayCoords } : r; 
               })
           );
           if (showForm && selectedRegionId) {
              const region = findRegionById(selectedRegionId);
              if (region) {
                 setMenuPosition(calculatePopoverPosition(region));
              }
           }
       };

       // Debounce the handler
       const debouncedWindowResizeHandler = debounce(handleResize, 150); 

       // Add listener to window
       window.addEventListener('resize', debouncedWindowResizeHandler);
       console.log("Window resize listener added.");

       // Cleanup function
       return () => {
           window.removeEventListener('resize', debouncedWindowResizeHandler);
           console.log("Window resize listener removed.");
           // If using lodash debounce, might call .cancel() here
       };
   // Dependencies: Only need state/setters used inside handleResize for UI updates
   }, [selectedRegionId, showForm, setMenuPosition]); 


  // Start drawing event listener (unchanged)
  useEffect(() => {
    const startDrawingHandler = () => {
      setSelectedRegionId(null);
      setDraggingRegionId(null);
      setResizingRegionId(null); 
      setShowForm(false);
      setIsCreating(true);
      setStartPoint(null);
      setCurrentPoint(null);
    };
    document.addEventListener('startDrawingRegion', startDrawingHandler);
    return () => {
      document.removeEventListener('startDrawingRegion', startDrawingHandler);
    };
  }, []);

  // Success message timer (unchanged)
  useEffect(() => {
      if (success) {
          const timer = setTimeout(() => setSuccess(null), 3000);
          return () => clearTimeout(timer);
      }
   }, [success]);

  // --- Event Handlers (Using Display Coordinates) ---
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (formInteractionRef.current || !containerRef.current) return;
    if ('preventDefault' in e) e.preventDefault();

    const point = getDisplayCoords(e);
    if (!point) return; // Click outside container

    const { x: mouseX, y: mouseY } = point; // These are DISPLAY coordinates

    // --- Check Resize Handle Click ---
    const selectedRegion = findRegionById(selectedRegionId);
    if (selectedRegion) {
      const handleSize = 24; // Display pixels for handle element
      const handleCornerX = selectedRegion.displayX + selectedRegion.displayWidth - (handleSize / 2); // Center of handle approx
      const handleCornerY = selectedRegion.displayY + selectedRegion.displayHeight - (handleSize / 2);

      // Check if mouse click is within handle bounds (display coords)
      if (
        mouseX >= handleCornerX - handleSize / 2 && mouseX <= handleCornerX + handleSize / 2 &&
        mouseY >= handleCornerY - handleSize / 2 && mouseY <= handleCornerY + handleSize / 2
      ) {
        console.log("Resize handle clicked (display coords)");
        setResizingRegionId(selectedRegion.id);
       setDraggingRegionId(null);
        // Store initial mouse position and region display dimensions
        setResizeStartPoint({ x: mouseX, y: mouseY });
        setResizeStartDims({ displayWidth: selectedRegion.displayWidth, displayHeight: selectedRegion.displayHeight });
        setIsCreating(false);
        return; // Don't check for region click or start drawing
      }
    }
    // --- End Resize Handle Check ---

    // --- Start Drawing ---
    if (isCreating) {
      setStartPoint({ x: mouseX, y: mouseY });
      setCurrentPoint({ x: mouseX, y: mouseY });
      setSelectedRegionId(null);
      setDraggingRegionId(null); 
      setResizingRegionId(null);
      setShowForm(false);
      return;
    }

    // --- Check Region Click ---
    let clickedRegion: ActiveRegion | null = null;
    // Iterate in reverse for Z-index order
    for (let i = activeRegions.length - 1; i >= 0; i--) {
      const region = activeRegions[i];
      // Hit test using DISPLAY coordinates
      if (
        mouseX >= region.displayX && mouseX <= region.displayX + region.displayWidth &&
        mouseY >= region.displayY && mouseY <= region.displayY + region.displayHeight
      ) {
        clickedRegion = region;
        break;
      }
    }

    if (clickedRegion) {
      // Region selected
      setSelectedRegionId(clickedRegion.id);
      setDraggingRegionId(null); // Will be set in mouseMove if dragged
      setResizingRegionId(null); 
      // Store the offset of the click relative to the region's top-left (display coords)
      setDragStartOffset({ x: mouseX - clickedRegion.displayX, y: mouseY - clickedRegion.displayY });
      setRegionName(clickedRegion.name || '');
      setMenuPosition(calculatePopoverPosition(clickedRegion));
      setShowForm(true);
    } else {
      // Clicked outside any region - deselect
      setSelectedRegionId(null);
      setDraggingRegionId(null);
      setResizingRegionId(null);
      setShowForm(false);
      setDragStartOffset(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current || formInteractionRef.current) return;
    
    const point = getDisplayCoords(e);
    if (!point) return; // Mouse outside container

    const { x: mouseX, y: mouseY } = point; // DISPLAY coordinates

    // --- Drawing --- 
    if (isCreating && startPoint) {
      setCurrentPoint({ x: mouseX, y: mouseY });
      return;
    }

    // --- Start Dragging Check ---
    // Only start dragging state if mouse moves beyond threshold *after* selecting
    if (selectedRegionId && !draggingRegionId && !resizingRegionId && dragStartOffset) {
      const selected = findRegionById(selectedRegionId);
      if(selected) {
          const initialMouseX = selected.displayX + dragStartOffset.x;
          const initialMouseY = selected.displayY + dragStartOffset.y;
          const movementThreshold = 5; // Display pixels threshold
          if (Math.abs(mouseX - initialMouseX) > movementThreshold || Math.abs(mouseY - initialMouseY) > movementThreshold) {
          console.log('Movement detected, starting drag state for region:', selectedRegionId);
          setDraggingRegionId(selectedRegionId);
              // Don't return, allow first drag update immediately
          }
      }
    }

    // --- Active Dragging ---
    if (draggingRegionId && dragStartOffset) {
        const region = findRegionById(draggingRegionId);
        if (!region) return; 

      // Calculate new top-left based on current mouse and initial offset (display coords)
      let targetX = mouseX - dragStartOffset.x;
      let targetY = mouseY - dragStartOffset.y;

      // --- Apply Snapping (Convert to/from Natural Coords) ---
      const magnetismConfig: MagnetismConfig = { type: magnetismType, distance: magnetismDistance };
      let snappedDisplayX = targetX;
      let snappedDisplayY = targetY;
      let guideHorizontal: number[] | null = null;
      let guideVertical: number[] | null = null;

      if (magnetismConfig.type !== 'none') {
          // 1. Convert target display rect to tentative natural rect
          const tentativeNatural = displayToNaturalRect({ displayX: targetX, displayY: targetY, displayWidth: region.displayWidth, displayHeight: region.displayHeight });
          // 2. Get other regions in natural coords (assuming applySnapping only needs coords + name)
          const otherRegionsNatural: Region[] = activeRegions
              .filter(r => r.id !== draggingRegionId)
              .map(ar => ({ 
                  ...displayToNaturalRect(ar),
                  name: ar.name // Keep name to satisfy Region type
              }));
          // 3. Apply snapping in natural coords
          const snappedNatural = applySnapping(
              tentativeNatural.x, tentativeNatural.y,
              tentativeNatural.width, tentativeNatural.height,
              // UNSAFE CAST: Assuming applySnapping only uses coordinate/name properties from ActiveRegion
              otherRegionsNatural as ActiveRegion[],
              null, // No specific element needed usually
            imageSize, 
              magnetismConfig,
              false // isResizing
        );
          // 4. Convert snapped natural rect back to display rect
          const { displayX: finalDisplayX, displayY: finalDisplayY } = naturalToDisplayRect(snappedNatural);
          snappedDisplayX = finalDisplayX;
          snappedDisplayY = finalDisplayY;
          
          // 5. Update guides (use natural coordinates returned by applySnapping)
          guideHorizontal = (snappedNatural.y !== tentativeNatural.y) ? [snappedNatural.y, snappedNatural.y + snappedNatural.height] : null;
          guideVertical = (snappedNatural.x !== tentativeNatural.x) ? [snappedNatural.x, snappedNatural.x + snappedNatural.width] : null;
      }
        setSnapGuides({ horizontal: guideHorizontal, vertical: guideVertical });
      // --- End Snapping ---

      // Bounds check (Display Coordinates relative to container) - Use snapped coords
      const rect = containerRef.current.getBoundingClientRect();
      snappedDisplayX = Math.max(0, Math.min(snappedDisplayX, rect.width - region.displayWidth));
      snappedDisplayY = Math.max(0, Math.min(snappedDisplayY, rect.height - region.displayHeight));

        setActiveRegions(currentRegions => currentRegions.map(r => 
          r.id === draggingRegionId ? { ...r, displayX: snappedDisplayX, displayY: snappedDisplayY } : r
        ));

      // Update popover if dragging the selected region - Use snapped coords
      if (draggingRegionId === selectedRegionId) {
        // Find the region again to get its potentially updated displayWidth for calculation
        const currentRegionState = findRegionById(draggingRegionId);
        if(currentRegionState) {
            // Calculate position based on the *potentially snapped* X/Y 
            // but the region's *current* width (width doesn't change during drag)
            const position = calculatePopoverPosition(currentRegionState); 
            setMenuPosition(position);
        }
      }
      return; // Stop processing if dragging
    }

    // --- Active Resizing ---
    if (resizingRegionId && resizeStartPoint && resizeStartDims) {
        const region = findRegionById(resizingRegionId);
        if (!region) return;

      // Calculate new dimensions based on mouse delta (display coords)
      let newWidth = resizeStartDims.displayWidth + (mouseX - resizeStartPoint.x);
      let newHeight = resizeStartDims.displayHeight + (mouseY - resizeStartPoint.y);

      // Bounds check and minimum size (Display Coordinates)
      const rect = containerRef.current.getBoundingClientRect();
      newWidth = Math.min(newWidth, rect.width - region.displayX);
      newHeight = Math.min(newHeight, rect.height - region.displayY);
      const minDisplaySize = 10; // Minimum size in display pixels
      newWidth = Math.max(minDisplaySize, newWidth);
      newHeight = Math.max(minDisplaySize, newHeight);

      // --- Apply Snapping (Convert to/from Natural Coords) ---
      const magnetismConfig: MagnetismConfig = { type: magnetismType, distance: magnetismDistance };
      let snappedDisplayWidth = newWidth;
      let snappedDisplayHeight = newHeight;
      let guideHorizontal: number[] | null = null;
      let guideVertical: number[] | null = null;

      if (magnetismConfig.type !== 'none') {
          // 1. Convert target display rect to tentative natural rect
          // Use the original region's displayX/Y but the *new* tentative display W/H
          const tentativeNatural = displayToNaturalRect({ 
              displayX: region.displayX, 
              displayY: region.displayY, 
              displayWidth: newWidth, // Tentative display width
              displayHeight: newHeight // Tentative display height
          });
          // 2. Get other regions in natural coords
          const otherRegionsNatural: Region[] = activeRegions
              .filter(r => r.id !== resizingRegionId)
              .map(ar => ({ 
                  ...displayToNaturalRect(ar),
                  name: ar.name
              })); 
          // 3. Apply snapping for resize (use isResizing = true)
          const snappedNatural = applySnapping(
              tentativeNatural.x, tentativeNatural.y, // Use the derived natural x/y
              tentativeNatural.width, tentativeNatural.height, // Pass the derived natural w/h
              otherRegionsNatural as ActiveRegion[], // Unsafe Cast
            null, 
            imageSize, 
            magnetismConfig, 
              true // isResizing = true
        );
          // 4. Convert snapped natural W/H back to display W/H
          // We only care about the snapped width/height here, not the x/y
          const { displayWidth: finalDisplayWidth, displayHeight: finalDisplayHeight } = naturalToDisplayRect(snappedNatural);
          snappedDisplayWidth = finalDisplayWidth;
          snappedDisplayHeight = finalDisplayHeight;
          
          // 5. Update guides (use natural coordinates of the *edges*)
          guideHorizontal = (snappedNatural.height !== tentativeNatural.height) ? [region.displayY + snappedNatural.height] : null;
          guideVertical = (snappedNatural.width !== tentativeNatural.width) ? [region.displayX + snappedNatural.width] : null;
      }
        setSnapGuides({ horizontal: guideHorizontal, vertical: guideVertical });
      // --- End Snapping ---

      // Update state with snapped display dimensions
        setActiveRegions(currentRegions => currentRegions.map(r =>
        r.id === resizingRegionId ? { ...r, displayWidth: snappedDisplayWidth, displayHeight: snappedDisplayHeight } : r
        ));

      // Update popover if resizing the selected region - Use snapped width
      if (resizingRegionId === selectedRegionId) {
          const currentRegionState = findRegionById(resizingRegionId);
          if (currentRegionState) {
              // Create a temporary region object with the *snapped* display width
              // to pass to the calculator function
              const tempRegionForCalc: ActiveRegion = {
                 ...currentRegionState,
                 displayWidth: snappedDisplayWidth, 
                 displayHeight: snappedDisplayHeight // Also pass updated height
              };
              const position = calculatePopoverPosition(tempRegionForCalc);
              setMenuPosition(position);
          }
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
    // setSnapGuides({ horizontal: null, vertical: null }); // No snapping
    if (formInteractionRef.current) {
      formInteractionRef.current = false; 
      return;
    }
    if (!containerRef.current) return;

    const wasDragging = !!draggingRegionId;
    const wasResizing = !!resizingRegionId;
    const wasCreating = isCreating && startPoint && currentPoint;

    // --- Finalize Drawing --- 
    if (wasCreating) {
        // Calculate display dimensions (use let for potential reassignment after snap)
        let displayX = Math.min(startPoint!.x, currentPoint!.x);
        let displayY = Math.min(startPoint!.y, currentPoint!.y);
        let displayWidth = Math.abs(startPoint!.x - currentPoint!.x);
        let displayHeight = Math.abs(startPoint!.y - currentPoint!.y);
        const minDisplaySize = 10; // Min display pixels

        if (displayWidth > minDisplaySize && displayHeight > minDisplaySize) {
            // Convert final display rect to natural coords for the new region's source
            let naturalCoords = displayToNaturalRect({ displayX, displayY, displayWidth, displayHeight });

            // --- Apply Snapping to New Region ---
            const magnetismConfig: MagnetismConfig = { type: magnetismType, distance: magnetismDistance };
            if (magnetismConfig.type !== 'none') {
                const otherRegionsNatural: Region[] = activeRegions.map(ar => ({ 
                    ...displayToNaturalRect(ar),
                    name: ar.name
                })); 
                const snappedNatural = applySnapping(
                    naturalCoords.x, naturalCoords.y, 
                    naturalCoords.width, naturalCoords.height,
                    otherRegionsNatural as ActiveRegion[], // Unsafe Cast
                    null, 
                    imageSize,
                    magnetismConfig,
                    false // isResizing = false (or maybe true? depends on snap logic for creation)
                );
                // Use the snapped natural coordinates
                naturalCoords = snappedNatural;
                
                // Update display coordinates based on snapped natural coords
                const snappedDisplayCoords = naturalToDisplayRect(snappedNatural);
                displayX = snappedDisplayCoords.displayX;
                displayY = snappedDisplayCoords.displayY;
                displayWidth = snappedDisplayCoords.displayWidth;
                displayHeight = snappedDisplayCoords.displayHeight;
                // Guides usually not shown after creation, but could set them here if needed
                setSnapGuides({horizontal: null, vertical: null}); 
            }
            // --- End Snapping ---

            // --- Generate Unique Default Name ---
            let defaultName = "New";
            let counter = 1;
            const existingNames = new Set(activeRegions.map(r => r.name));
            while (existingNames.has(defaultName)) {
                counter++;
                defaultName = `New_${counter}`;
            }
            // --- End Name Generation ---

            const newRegion = createNewRegion(
                naturalCoords.x,
                naturalCoords.y,
                naturalCoords.width,
                naturalCoords.height,
                undefined,
                defaultName // Use the generated unique name
            );
            // Create the ActiveRegion with both natural and display coords
            const newActiveRegion: ActiveRegion = {
              ...newRegion,
              displayX,
              displayY,
              displayWidth,
              displayHeight,
              isSelected: false,
              isResizing: false,
              isDragging: false,
            };

            const nextRegions = [...activeRegions, newActiveRegion];
            setActiveRegions(nextRegions); 
            setSelectedRegionId(newActiveRegion.id);
            setRegionName(newActiveRegion.name);
            setMenuPosition(calculatePopoverPosition(newActiveRegion));
            setShowForm(true);
            handleInteractionEnd(nextRegions); 
            
            } else {
          console.log("Drawing too small, cancelled.");
          // Call onComplete with current regions if drawing is cancelled
           const finalNaturalRegions = activeRegions.map(ar => {
                const natural = displayToNaturalRect(ar);
                return { ...natural, name: ar.name };
            });
            onComplete(finalNaturalRegions);
        }

        // Reset drawing state
            setIsCreating(false);
        setStartPoint(null);
        setCurrentPoint(null);
        document.dispatchEvent(new CustomEvent('drawingComplete', { bubbles: true }));

    } else if (wasDragging || wasResizing) {
        // Interaction ended, call onComplete with updated natural coords
        const endedRegionId = draggingRegionId || resizingRegionId;
        console.log('handleMouseUp: Ending drag/resize operation.');
        handleInteractionEnd(activeRegions); // This converts and calls onComplete, resets dragging/resizing IDs
        
        // --- Re-select region and keep form open after drag/resize ends ---
        if (endedRegionId) {
            const endedRegion = findRegionById(endedRegionId);
            if (endedRegion) {
                setSelectedRegionId(endedRegionId);
                setShowForm(true);
                // Recalculate popover position for the final spot
                setMenuPosition(calculatePopoverPosition(endedRegion)); 
            }
        }
        // --- End Re-selection ---
    }

    // Reset interaction-specific states (handleInteractionEnd does some of this)
    if (draggingRegionId) setDraggingRegionId(null);
    if (resizingRegionId) setResizingRegionId(null);
    if (dragStartOffset) setDragStartOffset(null);
    if (resizeStartPoint) setResizeStartPoint(null);
    if (resizeStartDims) setResizeStartDims(null);

    // If simply clicking, selection state is already handled in mouseDown
  };

  // --- Other Handlers --- 
   const handleRemoveRegion = (idToRemove: string) => {
    const nextRegions = activeRegions.filter(r => r.id !== idToRemove);
    if (selectedRegionId === idToRemove) {
        setSelectedRegionId(null);
        setShowForm(false);
    }
    setActiveRegions(nextRegions);
    handleInteractionEnd(nextRegions); // Update parent with removed list
  };

  const handleDuplicateRegion = (idToDuplicate: string) => {
    const regionToDuplicate = findRegionById(idToDuplicate);
    if (!regionToDuplicate) return;

    // Duplicate based on display coordinates with an offset
    const offset = 10; // Display pixels offset
    const newDisplayX = regionToDuplicate.displayX + offset;
    const newDisplayY = regionToDuplicate.displayY + offset;
    const newDisplayWidth = regionToDuplicate.displayWidth;
    const newDisplayHeight = regionToDuplicate.displayHeight;

    // Convert new display coords back to natural for the source
    const naturalCoords = displayToNaturalRect({ displayX: newDisplayX, displayY: newDisplayY, displayWidth: newDisplayWidth, displayHeight: newDisplayHeight });

    const newRegion = createNewRegion(
      naturalCoords.x,
      naturalCoords.y,
      naturalCoords.width,
      naturalCoords.height,
        undefined, 
        `${regionToDuplicate.name || 'Region'} Copy`
    );
    const newActiveRegion: ActiveRegion = {
      ...newRegion,
      displayX: newDisplayX,
      displayY: newDisplayY,
      displayWidth: newDisplayWidth,
      displayHeight: newDisplayHeight,
      isSelected: false, isResizing: false, isDragging: false,
    };

    const nextRegions = [...activeRegions, newActiveRegion];
    setActiveRegions(nextRegions);
    setSelectedRegionId(newActiveRegion.id);
    setRegionName(newActiveRegion.name);
    setMenuPosition(calculatePopoverPosition(newActiveRegion));
    setShowForm(true);
    handleInteractionEnd(nextRegions); // Update parent
  };

  const handleToggleDrawing = () => {
    setIsCreating(!isCreating);
    setSelectedRegionId(null);
    setShowForm(false);
    setDraggingRegionId(null);
    setResizingRegionId(null);
    if (!isCreating) {
        setStartPoint(null);
        setCurrentPoint(null);
    }
  };

  const handleNameRegion = (newName: string) => {
    if (selectedRegionId) {
        const nextRegions = activeRegions.map(r => 
            r.id === selectedRegionId ? { ...r, name: newName } : r
        );
        setActiveRegions(nextRegions);
        setShowForm(false); 
        handleInteractionEnd(nextRegions); // Update parent with new name
    }
  };

  // --- Handler to open edit form from RegionList ---
  const handleEditRegion = (idToEdit: string) => {
      const region = findRegionById(idToEdit);
      if (region) {
          setSelectedRegionId(idToEdit);
          setDraggingRegionId(null); 
          setResizingRegionId(null); 
          setRegionName(region.name || ''); 
          setMenuPosition(calculatePopoverPosition(region));
          setShowForm(true); 
    }
  };

  // --- Render Logic (Using Display Coords) ---
  const currentDrawingRegion = useMemo(() => {
       if (isCreating && startPoint && currentPoint) {
        // Calculate display dimensions directly
        const displayX = Math.min(startPoint.x, currentPoint.x);
        const displayY = Math.min(startPoint.y, currentPoint.y);
        const displayWidth = Math.abs(startPoint.x - currentPoint.x);
        const displayHeight = Math.abs(startPoint.y - currentPoint.y);
        return (
          <div 
            className="absolute border-2 border-primary bg-primary/30 z-10 dark:bg-primary/20 pointer-events-none"
            style={{
              left: `${displayX}px`,
              top: `${displayY}px`,
              width: `${displayWidth}px`,
              height: `${displayHeight}px`,
            }}
          />
        );
      }
      return null;
  }, [isCreating, startPoint, currentPoint]);
  
  const selectedRegionForForm = findRegionById(selectedRegionId);

  // --- Destructure for use in JSX ---
  const { renderedWidth, renderedHeight, offsetX, offsetY } = getScaleOffset();
  // ---

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Container - Styles controlled by parent/injected CSS */}
      <div 
        ref={containerRef}
        className={`relative border border-border rounded-md overflow-hidden dark:border-border ${isCreating ? 'cursor-crosshair' : getCursorStyle(false, !!resizingRegionId, !!draggingRegionId)}`}
        style={{
          width: '100%', // Container takes full width
          height: 'auto', // Height adjusts to aspect ratio
          aspectRatio: imageSize.width && imageSize.height ? `${imageSize.width}/${imageSize.height}` : '16/9',
          minHeight: 300, // Ensure a minimum height for interaction
          touchAction: 'none', // Prevent default touch actions like pinch-zoom
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown} // Use same handler for touch
        onTouchMove={handleMouseMove}   
        onTouchEnd={handleMouseUp}     
      >
        {/* Conditional rendering based on image loading state */}
        {(!finalImageSrc || (finalImageSrc && imageSize.width === 0 && imageSize.height === 0 && !error)) && (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                {error ? `Error: ${error}` : (finalImageSrc ? 'Loading image dimensions...' : 'No image provided')}
                  </div>
        )}
        {error && (
            <div className="absolute inset-0 flex items-center justify-center text-destructive">
                {error}
            </div>
        )}
        {finalImageSrc && imageSize.width > 0 && imageSize.height > 0 && renderedWidth > 0 && renderedHeight > 0 && (
                      <img
                        ref={imageRef}
                key={finalImageSrc} 
                src={finalImageSrc}
                        alt={t('regions.locationImage') || "Location image"}
                className="block select-none pointer-events-none" // Removed object-cover
                style={{
                  position: 'absolute', // Added for precise positioning
                  left: `${offsetX}px`,   // Added
                  top: `${offsetY}px`,    // Added
                  width: `${renderedWidth}px`, // Use renderedWidth
                  height: `${renderedHeight}px`, // Use renderedHeight
                  objectFit: 'contain', // Ensure the whole image is visible within these dimensions
                }}
                      />
        )}
                      
                      {/* Drawing overlay - Uses display coords */}
                      {currentDrawingRegion}
                      
                      {/* Existing regions - Use RegionDisplay with display coords */}
                      {activeRegions.map((region) => (
                         <RegionDisplay
                            key={region.id} 
                            // Pass display coords directly
                            displayX={region.displayX}
                            displayY={region.displayY}
                            displayWidth={region.displayWidth}
                            displayHeight={region.displayHeight}
                            name={region.name}
                            isSelected={region.id === selectedRegionId}
                            isResizing={region.id === resizingRegionId}
                            // Pass handlers - they operate on IDs
                            onDuplicate={() => handleDuplicateRegion(region.id)} 
                            onRemove={() => handleRemoveRegion(region.id)} 
                            // Pass style config props
                            defaultBorderColor={defaultBorderColor}
                            selectedBorderColor={selectedBorderColor}
                            borderWidth={borderWidth}
                          />
                      ))}

                      {/* Region Form Popover - Positioned with display coords */}
                      {showForm && selectedRegionForForm && (
                           <div 
                             style={{
                               position: 'absolute',
                               left: `${menuPosition.x}px`, // Use state variable
                               top: `${menuPosition.y}px`,
                               zIndex: 20, 
                               pointerEvents: 'all' 
                             }}
                             onClick={(e) => e.stopPropagation()}
                             onMouseDown={(e) => { formInteractionRef.current = true; e.stopPropagation(); }}
                             onMouseUp={(e) => { formInteractionRef.current = false; e.stopPropagation(); }}
                           >
                             {/* Form content unchanged... */}
                             <div 
                               className="bg-background/80 backdrop-blur-sm border border-border rounded-md shadow-lg p-3 dark:border-border dark:bg-background/70 w-60"
                               data-region-form="true"
                             >
                               <div className="flex flex-col gap-2">
                                 <Label htmlFor="region-name" className="text-sm font-medium">Region Name</Label>
                                 <Input
                                   id="region-name" 
                                   value={regionName}
                                   onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegionName(e.target.value)} 
                                   onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                     if (e.key === 'Enter') {
                                       e.preventDefault();
                                       handleNameRegion(regionName.trim());
                                     }
                                   }}
                                   placeholder={t('regions.namePlaceholder') || "Enter region name"}
                                   autoFocus
                                 />
                                 <div className="flex justify-end gap-2 mt-2">
                                   <Button 
                                     variant="outline" 
                                     size="sm"
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setShowForm(false);
                                       setError(null);
                                     }}
                                   >
                                     {t('common.cancel') || 'Cancel'}
                                   </Button>
                                   <Button 
                                     size="sm"
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       handleNameRegion(regionName.trim());
                                     }}
                                   >
                                     {t('common.save') || 'Save'}
                                   </Button>
                                 </div>
                               </div>
                             </div>
                           </div>
                        )}

                      {/* Snap Guides Removed for simplicity */}
                      {/* --- Snap Guides Visualization (Using Natural Coords + Scaling) --- */}
                      {snapGuides.vertical?.map((line, i) => {
                        // Need scale/offset info here
                        const { scaleX, offsetX, renderedHeight, offsetY } = getScaleOffset(); 
                        if (!scaleX) return null;
                        return (
                          <div 
                            key={`v-${i}`} 
                            className="absolute bg-red-500 w-px pointer-events-none" 
                            style={{ 
                              left: `${(line / scaleX) + offsetX}px`, // Convert natural line coord to display
                              top: `${offsetY}px`, 
                              height: `${renderedHeight}px`, 
                              zIndex: 5 
                            }}
                           />
                        )}
                      )}
                      {snapGuides.horizontal?.map((line, i) => {
                        const { scaleY, offsetY, renderedWidth, offsetX } = getScaleOffset();
                         if (!scaleY) return null;
                        return (
                          <div 
                            key={`h-${i}`} 
                            className="absolute bg-red-500 h-px pointer-events-none" 
                            style={{ 
                              top: `${(line / scaleY) + offsetY}px`, // Convert natural line coord to display
                              left: `${offsetX}px`,
                              width: `${renderedWidth}px`, 
                              zIndex: 5 
                            }}
                          /> 
                        )}
                      )}
                      {/* --- End Snap Guides --- */}

                      {/* --- Add Region Button (Top Left) --- */}
                      <Button
                        type="button"
                        variant={isCreating ? "secondary" : "default"}
                        size="sm"
                        className="absolute top-4 left-4 z-50 shadow" // Position top-left
                        onClick={handleToggleDrawing}
                        disabled={!imageSize.width}
                      >
                        {isCreating 
                            ? <><XIcon className="w-4 h-4 mr-1" />{t('common.cancel') || "Cancel"}</>
                            : <><PlusIcon className="w-4 h-4 mr-1" />{t('regions.addRegion') || "Add Region"}</>
                        }
                      </Button>
                      {/* --- End Add Region Button --- */}

                      {/* --- Settings Icon & Popover --- */}
                      <Popover open={Boolean(settingsAnchorEl)} onOpenChange={(open) => !open && setSettingsAnchorEl(null)}>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-2 right-2 z-30 bg-white bg-opacity-75 hover:bg-opacity-100 rounded-full p-1"
                            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                                // console.log('Settings button clicked, setting anchor:', event.currentTarget);
                                setSettingsAnchorEl(event.currentTarget);
                            }} 
                            aria-label="Magnetism Settings"
                          >
                            <SettingsIcon className="h-5 w-5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent 
                           className="w-60 z-50" // Use high z-index
                           align="end"
                           onInteractOutside={() => setSettingsAnchorEl(null)}
                        >
                           {/* Content with Magnetism and Border Styles... */}
                           <div className="grid gap-4">
                            <div className="space-y-2">
                              <h4 className="font-medium leading-none">Magnetism Settings</h4>
                              <p className="text-sm text-muted-foreground">
                                Configure snapping behavior.
                              </p>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="magnetism-type">Type</Label>
                              <RadioGroup 
                                id="magnetism-type"
                                value={magnetismType} 
                                onValueChange={(value: string) => setMagnetismType(value as MagnetismType)} 
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="none" id="m-none" />
                                  <Label htmlFor="m-none">None</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="edges" id="m-edges" />
                                  <Label htmlFor="m-edges">Edges</Label>
                                </div>
                              </RadioGroup>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="magnetism-distance">Distance (px)</Label>
                              <Input 
                                id="magnetism-distance" 
                                type="number" 
                                value={magnetismDistance}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMagnetismDistance(Math.max(1, parseInt(e.target.value) || 1))} 
                                min="1"
                                className="col-span-2 h-8"
                                disabled={magnetismType === 'none'}
                              />
                            </div>
                            {/* --- Border Style Settings --- */}
                            <div className="border-t border-border pt-4 mt-4"> 
                                <h4 className="font-medium leading-none mb-2">Border Styles</h4>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-3 items-center"> 
                                    {/* Default Border */}
                                    <Label htmlFor="default-border-color" className="text-sm">Default Color</Label>
                                    <ColorPickerPopover 
                                        id="default-border-color" 
                                        value={defaultBorderColor}
                                        onChange={setDefaultBorderColor}
                                    />
                                    {/* Selected Border */}
                                    <Label htmlFor="selected-border-color" className="text-sm">Selected Color</Label>
                                    <ColorPickerPopover 
                                        id="selected-border-color" 
                                        value={selectedBorderColor}
                                        onChange={setSelectedBorderColor}
                                    />
                                    {/* Single Width Setting */}
                                    <Label htmlFor="border-width" className="text-sm">Border Width (px)</Label>
                                    <Input 
                                        id="border-width" 
                                        type="number" 
                                        value={borderWidth}
                                        onChange={(e) => setBorderWidth(Math.max(0, parseInt(e.target.value) || 0))} 
                                        min="0"
                                        className="h-8"
                                    />
                                </div>
                            </div>
                            {/* --- End Border Style Settings --- */}
                          </div>
                        </PopoverContent>
                      </Popover>
                       {/* --- End Settings Icon & Popover --- */}
      </div>

      {/* Right side: Controls and Region List */}
      <div className="flex flex-col gap-4 w-full sm:w-auto flex-shrink-0">
        {/* Controls - REMOVED Add Region button */}
        {/* <div className="flex gap-2">
           <Button
              variant={isCreating ? "secondary" : "outline"}
              size="sm"
              onClick={handleToggleDrawing}
            >
              {isCreating ? t('common.done') || "Done" : t('regions.addRegion') || "Add Region"}
            </Button>
        </div> */}

        {/* Region list */}
        <RegionList
          regions={activeRegions} // Pass full ActiveRegion for now
          selectedRegionId={selectedRegionId} 
          onSelectRegion={(id: string) => {
              setSelectedRegionId(id);
              const region = findRegionById(id);
              if (region) {
                  setDraggingRegionId(null); 
                  setResizingRegionId(null); 
                  setRegionName(region.name || ''); 
                  // Position popover based on display coords
                  setMenuPosition({ x: region.displayX + region.displayWidth + 10, y: region.displayY });
                  setShowForm(true); 
              }
          }} 
          onRemoveRegion={handleRemoveRegion}
          onEditRegion={handleEditRegion}
        />

        {/* Success/Error Messages */}
        {success && <p className="text-sm text-green-600 mt-2">{success}</p>}
        {error && !imageSize.width && <p className="text-sm text-red-600 mt-2">{error}</p>} 

      </div>
    </div>
  );
}

// Helper to determine cursor style (keep)
function getCursorStyle(isCreating: boolean, isResizing: boolean, isDragging: boolean): string {
  if (isCreating) return 'crosshair';
  if (isResizing) return 'se-resize'; // Use standard resize cursor for bottom-right
  if (isDragging) return 'grabbing';
  // Maybe add 'grab' on hover over region? Requires more state.
  return 'default'; 
}

