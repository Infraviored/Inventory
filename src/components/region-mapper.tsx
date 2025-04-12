"use client";

import { useState, useEffect, useRef } from 'react';
import { getLocationRegions, addLocationRegion, Region } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// This is the component used by location-form.tsx
interface RegionMapperFormProps {
  imageSrc: string;
  onComplete: (regions: Array<{name: string, x: number, y: number, width: number, height: number}>) => void;
  initialRegions?: Array<{name: string, x: number, y: number, width: number, height: number}>;
}

export function RegionMapper({ imageSrc, onComplete, initialRegions = [] }: RegionMapperFormProps) {
  const [regions, setRegions] = useState<Array<{name: string, x: number, y: number, width: number, height: number}>>(initialRegions);
  const [drawing, setDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [regionName, setRegionName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Log on mount to verify component is initialized correctly
  useEffect(() => {
    console.log('RegionMapper initialized with image:', imageSrc);
    console.log('Initial regions:', initialRegions);
  }, [imageSrc, initialRegions]);

  // Handle mouse down (start drawing)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current || !imageRef.current) {
      console.error('Container or image ref not available');
      return;
    }
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setStartX(x);
    setStartY(y);
    setCurrentX(x);
    setCurrentY(y);
    setDrawing(true);
    console.log(`Started drawing at (${x}, ${y})`);
  };

  // Handle mouse move (update rectangle)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentX(x);
    setCurrentY(y);
  };

  // Handle mouse up (finish drawing)
  const handleMouseUp = () => {
    if (!drawing) return;
    
    setDrawing(false);
    
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    
    console.log(`Finished drawing, size: ${width}x${height}`);
    
    // Only show form if the rectangle has a minimum size
    if (width > 10 && height > 10) {
      setShowForm(true);
    } else {
      console.log('Rectangle too small, ignoring');
    }
  };

  // Calculate rectangle dimensions
  const getRectStyle = () => {
    if (!drawing && !showForm) return { display: 'none' };
    
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      borderColor: '#3b82f6',
      backgroundColor: '#3b82f633',
    };
  };

  // Handle form submission
  const handleAddRegion = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!regionName.trim()) {
      setError('Please enter a region name');
      return;
    }
    
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    
    const newRegion = {
      name: regionName,
      x: left,
      y: top,
      width,
      height,
    };
    
    const updatedRegions = [...regions, newRegion];
    setRegions(updatedRegions);
    setRegionName('');
    setShowForm(false);
    setError(null);
    
    console.log('Added new region:', newRegion);
    console.log('Updated regions:', updatedRegions);
  };

  const handleRemoveRegion = (index: number) => {
    const updatedRegions = [...regions];
    const removedRegion = updatedRegions[index];
    updatedRegions.splice(index, 1);
    setRegions(updatedRegions);
    console.log('Removed region:', removedRegion);
  };

  const handleComplete = () => {
    console.log('Completing region mapping with:', regions);
    onComplete(regions);
  };

  return (
    <div className="space-y-4 border rounded-md p-4 bg-muted/50">
      <h3 className="font-medium">Regionen definieren</h3>
      
      {error && (
        <div className="p-2 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <div 
        ref={containerRef} 
        className="relative overflow-hidden border rounded-md cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => drawing && setDrawing(false)}
      >
        <img 
          ref={imageRef}
          src={imageSrc}
          alt="Image to define regions on"
          className="max-w-full h-auto"
          onError={() => {
            console.error('Failed to load image:', imageSrc);
            setError('Failed to load image. Please try again with a different image.');
          }}
        />
        
        {/* Drawing rectangle */}
        <div 
          className="absolute border-2 border-primary pointer-events-none" 
          style={getRectStyle()}
        />
        
        {/* Existing regions */}
        {regions.map((region, i) => (
          <div 
            key={i}
            className="absolute border-2 border-primary bg-primary/20 flex items-center justify-center text-xs font-medium"
            style={{
              left: `${region.x}px`,
              top: `${region.y}px`,
              width: `${region.width}px`,
              height: `${region.height}px`,
            }}
          >
            <span className="bg-background/80 px-1 py-0.5 rounded">{region.name}</span>
          </div>
        ))}
      </div>
      
      {showForm && (
        <form onSubmit={handleAddRegion} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="region-name">Region Name</Label>
            <Input
              id="region-name"
              value={regionName}
              onChange={(e) => setRegionName(e.target.value)}
              placeholder="Enter name for this region"
              required
            />
          </div>
          
          <div className="flex space-x-2">
            <Button type="submit" size="sm">Add Region</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}
      
      {regions.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Defined Regions ({regions.length})</h4>
          <ul className="space-y-2">
            {regions.map((region, i) => (
              <li key={i} className="flex justify-between items-center p-2 bg-background rounded-md">
                <span>{region.name}</span>
                <Button 
                  type="button" 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => handleRemoveRegion(i)} 
                  className="h-7 w-7 p-0"
                >
                  ×
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="flex justify-end space-x-2">
        <Button type="button" onClick={handleComplete}>
          Complete
        </Button>
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
