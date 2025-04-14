"use client";

import { useState, useEffect, useRef } from 'react';
import { getLocationRegions, addLocationRegion, Region } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Move, Square, Trash, Plus, AlertCircle, Info } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

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

export function RegionMapper({ imageSrc, onComplete, initialRegions = [] }: RegionMapperFormProps) {
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

  // Update parent component with regions whenever they change
  useEffect(() => {
    const formattedRegions = regions.map(({ name, x, y, width, height }) => ({
      name, x, y, width, height
    }));
    onComplete(formattedRegions);
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

    // If we're in creation mode, set start point
    if (isCreating) {
      if (!startPoint) {
        // First click - start drawing
        setStartPoint({ x, y });
        setCurrentPoint({ x, y });
        console.log(`Started drawing at (${x}, ${y})`);
      } else {
        // Second click - finish drawing
        const width = Math.abs(x - startPoint.x);
        const height = Math.abs(y - startPoint.y);
        
        if (width > 10 && height > 10) {
          const left = Math.min(startPoint.x, x);
          const top = Math.min(startPoint.y, y);

          // Create the new region temporarily
          const newRegion: ActiveRegion = {
            id: `region-${Date.now()}`,
            name: '',
            x: left,
            y: top,
            width,
            height,
            isSelected: true,
            isResizing: false,
            isDragging: false
          };
          
          setRegions(prev => prev.map(r => ({ ...r, isSelected: false })).concat(newRegion));
          setSelectedRegionId(newRegion.id);
          setRegionName('');
          
          // Position the form menu next to the region
          setMenuPosition({
            x: left + width + 10,
            y: top
          });
          setShowForm(true);
          
          // Exit creation mode after adding a region
          setIsCreating(false);
          
          console.log(`Created region: ${width}x${height} at (${left},${top})`);
          setSuccess('Region created! Please name it.');
        } else {
          console.log('Region too small, ignoring');
          setError('Region too small. Please create a larger region (at least 10x10 pixels).');
        }
        
        // Reset drawing state
        setStartPoint(null);
        setCurrentPoint(null);
      }
      return;
    }
    
    // If we're not creating, check if we clicked on a region
    const clickedRegion = regions.find(region => 
      x >= region.x && 
      x <= (region.x + region.width) && 
      y >= region.y && 
      y <= (region.y + region.height)
    );
    
    if (clickedRegion) {
      // Select the region and deselect others
      setRegions(regions.map(r => ({
        ...r,
        isSelected: r.id === clickedRegion.id,
        isDragging: false,
        isResizing: false
      })));
      setSelectedRegionId(clickedRegion.id);
      
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
      if (!startPoint) {
        setStartPoint({ x, y });
        setCurrentPoint({ x, y });
      } else {
        const width = Math.abs(x - startPoint.x);
        const height = Math.abs(y - startPoint.y);
        
        if (width > 10 && height > 10) {
          const left = Math.min(startPoint.x, x);
          const top = Math.min(startPoint.y, y);

          const newRegion: ActiveRegion = {
            id: `region-${Date.now()}`,
            name: '',
            x: left,
            y: top,
            width,
            height,
            isSelected: true,
            isResizing: false,
            isDragging: false
          };
          
          setRegions(prev => prev.map(r => ({ ...r, isSelected: false })).concat(newRegion));
          setSelectedRegionId(newRegion.id);
          setRegionName('');
          
          setMenuPosition({
            x: left + width + 10,
            y: top
          });
          setShowForm(true);
          
          // Exit creation mode after adding a region
          setIsCreating(false);
          
          setSuccess('Region created! Please name it.');
        } else {
          setError('Region too small. Please create a larger region (at least 10x10 pixels).');
        }
        
        setStartPoint(null);
        setCurrentPoint(null);
      }
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
        isDragging: false,
        isResizing: false
      })));
      setSelectedRegionId(touchedRegion.id);
      
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

  // Handle mouse move (update rectangle or drag)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // If we're drawing, update current point
    if (isCreating && startPoint) {
      setCurrentPoint({ x, y });
      return;
    }
    
    // If we're dragging a region
    const draggingRegion = regions.find(r => r.isDragging);
    if (draggingRegion) {
      // Calculate movement
      const deltaX = x - (draggingRegion.x + draggingRegion.width / 2);
      const deltaY = y - (draggingRegion.y + draggingRegion.height / 2);
      
      // Update region position
      setRegions(regions.map(r => {
        if (r.id === draggingRegion.id) {
          const newX = Math.max(0, Math.min(r.x + deltaX, imageSize.width - r.width));
          const newY = Math.max(0, Math.min(r.y + deltaY, imageSize.height - r.height));
          
          // Update menu position if this is the selected region
          if (r.id === selectedRegionId && showForm) {
            setMenuPosition({
              x: newX + r.width + 10,
              y: newY
            });
          }
          
          return {
            ...r,
            x: newX,
            y: newY
          };
        }
        return r;
      }));
    }
    
    // If we're resizing a region
    const resizingRegion = regions.find(r => r.isResizing);
    if (resizingRegion) {
      setRegions(regions.map(r => {
        if (r.id === resizingRegion.id) {
          const newWidth = Math.max(20, x - r.x);
          const newHeight = Math.max(20, y - r.y);
          
          // Update menu position if this is the selected region
          if (r.id === selectedRegionId && showForm) {
            setMenuPosition({
              x: r.x + newWidth + 10,
              y: r.y
            });
          }
          
          return {
            ...r,
            width: newWidth,
            height: newHeight
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
    
    const draggingRegion = regions.find(r => r.isDragging);
    if (draggingRegion) {
      const deltaX = x - (draggingRegion.x + draggingRegion.width / 2);
      const deltaY = y - (draggingRegion.y + draggingRegion.height / 2);
      
      setRegions(regions.map(r => {
        if (r.id === draggingRegion.id) {
          const newX = Math.max(0, Math.min(r.x + deltaX, imageSize.width - r.width));
          const newY = Math.max(0, Math.min(r.y + deltaY, imageSize.height - r.height));
          
          if (r.id === selectedRegionId && showForm) {
            setMenuPosition({
              x: newX + r.width + 10,
              y: newY
            });
          }
          
          return {
            ...r,
            x: newX,
            y: newY
          };
        }
        return r;
      }));
    }
    
    const resizingRegion = regions.find(r => r.isResizing);
    if (resizingRegion) {
      setRegions(regions.map(r => {
        if (r.id === resizingRegion.id) {
          const newWidth = Math.max(20, x - r.x);
          const newHeight = Math.max(20, y - r.y);
          
          if (r.id === selectedRegionId && showForm) {
            setMenuPosition({
              x: r.x + newWidth + 10,
              y: r.y
            });
          }
          
          return {
            ...r,
            width: newWidth,
            height: newHeight
          };
        }
        return r;
      }));
    }
  };

  // Handle mouse up (finish dragging or resizing)
  const handleMouseUp = () => {
    // End any dragging or resizing
    setRegions(regions.map(r => ({
      ...r,
      isDragging: false,
      isResizing: false
    })));
  };

  // Handle touch end for mobile devices
  const handleTouchEnd = () => {
    // Similar logic to handleMouseUp
    setRegions(regions.map(r => ({
      ...r,
      isDragging: false,
      isResizing: false
    })));
  };

  // Create region from manual dimensions
  const handleCreateManualRegion = () => {
    // Validate dimensions are within image bounds
    const { x, y, width, height } = manualDimensions;
    
    if (x < 0 || y < 0 || width <= 0 || height <= 0) {
      setError('Region dimensions must be positive values');
      return;
    }
    
    if (x + width > imageSize.width || y + height > imageSize.height) {
      setError(`Region dimensions must be within image bounds (${imageSize.width}x${imageSize.height})`);
      return;
    }
    
    const newRegion: ActiveRegion = {
      id: `region-${Date.now()}`,
      name: '',
      x, y, width, height,
      isSelected: true,
      isResizing: false,
      isDragging: false
    };
    
    setRegions(prev => prev.map(r => ({ ...r, isSelected: false })).concat(newRegion));
    setSelectedRegionId(newRegion.id);
    setRegionName('');
    
    // Position the form menu next to the region
    setMenuPosition({
      x: x + width + 10,
      y: y
    });
    setShowForm(true);
    setSuccess('Region created! Please name it.');
  };

  // Handle form submission to name a region
  const handleNameRegion = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!regionName.trim()) {
      setError('Please enter a region name');
      return;
    }
    
    // Check for duplicate names
    const isDuplicate = regions.some(r => 
      r.id !== selectedRegionId && r.name.toLowerCase() === regionName.trim().toLowerCase()
    );
    
    if (isDuplicate) {
      setError('A region with this name already exists. Please choose a different name.');
      return;
    }
    
    setRegions(regions.map(r => {
      if (r.id === selectedRegionId) {
        return { ...r, name: regionName.trim() };
      }
      return r;
    }));
    
    setShowForm(false);
    setError(null);
    setSuccess('Region named successfully!');
    
    console.log(`Named region ${selectedRegionId} as "${regionName}"`);
  };

  // Open the naming form for a region
  const handleOpenNameForm = (id: string) => {
    const region = regions.find(r => r.id === id);
    if (!region) return;
    
    setSelectedRegionId(id);
    setRegionName(region.name);
    
    // Position the form menu next to the region
    setMenuPosition({
      x: region.x + region.width + 10,
      y: region.y
    });
    
    setShowForm(true);
  };

  // Remove a region
  const handleRemoveRegion = (id: string) => {
    setRegions(regions.filter(r => r.id !== id));
    if (selectedRegionId === id) {
      setSelectedRegionId(null);
      setShowForm(false);
    }
    setSuccess('Region removed successfully!');
  };

  // Copy a region
  const handleCopyRegion = (id: string) => {
    const regionToCopy = regions.find(r => r.id === id);
    if (!regionToCopy) return;
    
    const newRegion: ActiveRegion = {
      ...regionToCopy,
      id: `region-${Date.now()}`,
      name: `${regionToCopy.name} (Copy)`,
      x: regionToCopy.x + 20,
      y: regionToCopy.y + 20,
      isSelected: true
    };
    
    // Ensure the copied region is within bounds
    if (newRegion.x + newRegion.width > imageSize.width) {
      newRegion.x = Math.max(0, imageSize.width - newRegion.width);
    }
    
    if (newRegion.y + newRegion.height > imageSize.height) {
      newRegion.y = Math.max(0, imageSize.height - newRegion.height);
    }
    
    setRegions(prev => 
      prev.map(r => ({ ...r, isSelected: false })).concat(newRegion)
    );
    setSelectedRegionId(newRegion.id);
    
    // Position the form menu next to the new region
    setMenuPosition({
      x: newRegion.x + newRegion.width + 10,
      y: newRegion.y
    });
    
    setSuccess('Region copied successfully!');
  };

  // Toggle resize mode for a region
  const handleToggleResize = (id: string) => {
    setRegions(regions.map(r => {
      if (r.id === id) {
        return { ...r, isResizing: !r.isResizing, isDragging: false };
      }
      return { ...r, isResizing: false };
    }));
  };

  // Toggle drag mode for a region
  const handleToggleDrag = (id: string) => {
    setRegions(regions.map(r => {
      if (r.id === id) {
        return { ...r, isDragging: !r.isDragging, isResizing: false };
      }
      return { ...r, isDragging: false };
    }));
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

  // Calculate form position to ensure it stays within viewport
  const getFormPosition = () => {
    if (!containerRef.current) return { left: '0px', top: '0px' };
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const formWidth = 250; // Approximate width of the form
    const formHeight = 200; // Approximate height of the form
    
    // Check if form would go outside the container on the right
    let left = menuPosition.x;
    if (left + formWidth > containerRect.width) {
      // Place form on the left side of the region instead
      const selectedRegion = regions.find(r => r.id === selectedRegionId);
      if (selectedRegion) {
        left = Math.max(0, selectedRegion.x - formWidth - 10);
      } else {
        left = Math.max(0, containerRect.width - formWidth);
      }
    }
    
    // Check if form would go outside the container on the bottom
    let top = menuPosition.y;
    if (top + formHeight > containerRect.height) {
      top = Math.max(0, containerRect.height - formHeight);
    }
    
    // For mobile devices, position the form at the bottom of the container
    if (isMobile) {
      return {
        left: '0px',
        top: 'auto',
        bottom: '0px',
        width: '100%',
        position: 'absolute' as 'absolute'
      };
    }
    
    return {
      left: `${left}px`,
      top: `${top}px`,
    };
  };

  return (
    <div className="space-y-4 border rounded-md p-4 bg-muted/50">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Regionen definieren</h3>
        <div className="flex space-x-2">
          <Button 
            type="button" 
            size="sm"
            variant={isCreating ? "secondary" : "outline"}
            onClick={() => {
              setIsCreating(!isCreating);
              setStartPoint(null);
              setCurrentPoint(null);
              setError(null);
            }}
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            {isCreating ? "Beenden" : "Region hinzufügen"}
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="p-2 mb-2 bg-red-100 text-red-700 rounded-md text-sm flex items-center">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="p-2 mb-2 bg-green-100 text-green-700 rounded-md text-sm flex items-center">
          <Info className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
      
      <div className="relative">
        <div 
          ref={containerRef} 
          className="relative overflow-hidden border rounded-md"
          style={{ cursor: isCreating ? 'crosshair' : 'default' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img 
            ref={imageRef}
            src={imageSrc}
            alt="Image to define regions on"
            className="max-w-full h-auto"
            onLoad={handleImageLoad}
            onError={() => {
              console.error('Failed to load image:', imageSrc);
              setError('Failed to load image. Please try again with a different image.');
            }}
          />
          
          {/* Currently drawing rectangle */}
          {isCreating && startPoint && (
            <div 
              className="absolute border-2 border-primary bg-primary/20 pointer-events-none"
              style={getDrawingRectStyle()}
            >
              {currentPoint && (
                <div className="absolute bottom-0 right-0 bg-background/90 text-xs px-1 py-0.5 rounded">
                  {Math.abs(currentPoint.x - startPoint.x)}×{Math.abs(currentPoint.y - startPoint.y)}
                </div>
              )}
            </div>
          )}
          
          {/* Existing regions */}
          {regions.map((region) => (
            <div 
              key={region.id}
              className={`absolute border-2 ${region.isSelected ? 'border-yellow-500' : 'border-primary'} 
                          ${region.isSelected ? 'bg-yellow-500/20' : 'bg-primary/20'} flex items-center justify-center`}
              style={{
                left: `${region.x}px`,
                top: `${region.y}px`,
                width: `${region.width}px`,
                height: `${region.height}px`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                // Select this region
                setRegions(regions.map(r => ({
                  ...r,
                  isSelected: r.id === region.id,
                  isDragging: false,
                  isResizing: false
                })));
                setSelectedRegionId(region.id);
                
                // Position the form menu next to the region
                setMenuPosition({
                  x: region.x + region.width + 10,
                  y: region.y
                });
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleOpenNameForm(region.id);
              }}
            >
              <span className={`bg-background/90 px-1 py-0.5 rounded text-xs ${region.name ? '' : 'text-muted-foreground'}`}>
                {region.name || 'Unnamed'}
              </span>
              
              {region.isSelected && (
                <div className="absolute -top-7 left-0 right-0 flex justify-center space-x-1">
                  <button 
                    className="bg-background border rounded-md p-1 hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleDrag(region.id);
                    }}
                    title="Move region"
                    aria-label="Move region"
                  >
                    <Move className="h-3 w-3" />
                  </button>
                  <button 
                    className="bg-background border rounded-md p-1 hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleResize(region.id);
                    }}
                    title="Resize region"
                    aria-label="Resize region"
                  >
                    <Square className="h-3 w-3" />
                  </button>
                  <button 
                    className="bg-background border rounded-md p-1 hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyRegion(region.id);
                    }}
                    title="Copy region"
                    aria-label="Copy region"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button 
                    className="bg-background border rounded-md p-1 hover:bg-muted text-red-500 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveRegion(region.id);
                    }}
                    title="Delete region"
                    aria-label="Delete region"
                  >
                    <Trash className="h-3 w-3" />
                  </button>
                </div>
              )}
              
              {/* Size indicator */}
              <div className="absolute bottom-0 right-0 bg-background/90 text-xs px-1 py-0.5 rounded">
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
              <form onSubmit={handleNameRegion} className="space-y-3">
                <h4 className="font-medium text-sm">Region benennen</h4>
                {error && (
                  <div className="p-2 bg-red-100 text-red-700 rounded-md text-xs">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="region-name" className="text-xs">Name der Region</Label>
                  <Input
                    id="region-name"
                    value={regionName}
                    onChange={(e) => setRegionName(e.target.value)}
                    placeholder="Namen eingeben"
                    required
                    className="h-8"
                    autoFocus
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button type="submit" size="sm" className="flex-1">Speichern</Button>
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
                    Abbrechen
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
        
        {/* Region list - shown below the image */}
        {regions.length > 0 && (
          <div className="mt-4 p-3 border rounded-md space-y-3">
            <h4 className="font-medium text-sm">Definierte Regionen ({regions.length})</h4>
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
                    onDoubleClick={() => handleOpenNameForm(region.id)}
                  >
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-sm bg-primary"
                        style={{backgroundColor: region.isSelected ? 'rgb(234 179 8)' : ''}}
                      />
                      <span className={`text-sm ${!region.name && 'text-muted-foreground italic'}`}>
                        {region.name || 'Unnamed'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-xs text-muted-foreground">
                        {Math.round(region.width)}×{Math.round(region.height)}
                      </div>
                      <button
                        className="text-xs text-blue-500 hover:text-blue-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenNameForm(region.id);
                        }}
                      >
                        Umbenennen
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
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
        setError('Failed to fetch regions');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRegions();
  }, [locationId]);

  return (
    <div>
      <div className="text-center p-4">
        {loading && <div>Loading regions...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {!loading && !error && regions.length === 0 && <div>No regions defined yet</div>}
      </div>
      <img src={imagePath} alt="Location" className="max-w-full h-auto border rounded-md" />
    </div>
  );
}
