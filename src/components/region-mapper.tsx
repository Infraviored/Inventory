import { useState, useEffect, useRef } from 'react';
import { getLocationRegions, addLocationRegion, Region } from '@/lib/api';

interface RegionMapperProps {
  locationId: number;
  imagePath: string;
}

export default function RegionMapper({ locationId, imagePath }: RegionMapperProps) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [regionName, setRegionName] = useState('');
  const [lastCreatedRegion, setLastCreatedRegion] = useState<{width: number, height: number} | null>(null);
  const [duplicateMode, setDuplicateMode] = useState(false);
  const [regionColor, setRegionColor] = useState('#3b82f6'); // Default blue color
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Fetch existing regions
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

  // Handle mouse down (start drawing)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current || !imageRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setStartX(x);
    setStartY(y);
    setCurrentX(x);
    setCurrentY(y);
    setDrawing(true);
  };

  // Handle mouse move (update rectangle)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (duplicateMode && lastCreatedRegion) {
      // In duplicate mode, maintain the size of the last created region
      setCurrentX(x);
      setCurrentY(y);
    } else {
      setCurrentX(x);
      setCurrentY(y);
    }
  };

  // Handle mouse up (finish drawing)
  const handleMouseUp = () => {
    if (!drawing) return;
    
    setDrawing(false);
    
    let width, height;
    
    if (duplicateMode && lastCreatedRegion) {
      // Use the dimensions from the last created region
      width = lastCreatedRegion.width;
      height = lastCreatedRegion.height;
    } else {
      width = Math.abs(currentX - startX);
      height = Math.abs(currentY - startY);
    }
    
    // Only show form if the rectangle has a minimum size
    if (width > 10 && height > 10) {
      setShowForm(true);
    }
  };

  // Calculate rectangle dimensions
  const getRectStyle = () => {
    if (!drawing && !showForm) return { display: 'none' };
    
    let left, top, width, height;
    
    if (duplicateMode && lastCreatedRegion) {
      // In duplicate mode, use the last region's dimensions but position at current mouse
      left = startX;
      top = startY;
      width = lastCreatedRegion.width;
      height = lastCreatedRegion.height;
    } else {
      left = Math.min(startX, currentX);
      top = Math.min(startY, currentY);
      width = Math.abs(currentX - startX);
      height = Math.abs(currentY - startY);
    }
    
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      borderColor: regionColor,
      backgroundColor: `${regionColor}33`, // Add transparency
    };
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!regionName.trim()) {
      alert('Please enter a region name');
      return;
    }
    
    try {
      let left, top, width, height;
      
      if (duplicateMode && lastCreatedRegion) {
        // In duplicate mode, use the last region's dimensions but position at current mouse
        left = startX;
        top = startY;
        width = lastCreatedRegion.width;
        height = lastCreatedRegion.height;
      } else {
        left = Math.min(startX, currentX);
        top = Math.min(startY, currentY);
        width = Math.abs(currentX - startX);
        height = Math.abs(currentY - startY);
      }
      
      // Snap to nearby regions (improved implementation)
      const snapThreshold = 15; // Increased threshold for better snapping
      let snappedLeft = left;
      let snappedTop = top;
      let snappedRight = left + width;
      let snappedBottom = top + height;
      
      regions.forEach(region => {
        // Snap left edge
        if (Math.abs(left - region.x) < snapThreshold) {
          snappedLeft = region.x;
        }
        // Snap right edge to left edge of existing region
        if (Math.abs(left + width - region.x) < snapThreshold) {
          snappedRight = region.x;
        }
        // Snap left edge to right edge of existing region
        if (Math.abs(left - (region.x + region.width)) < snapThreshold) {
          snappedLeft = region.x + region.width;
        }
        // Snap right edge
        if (Math.abs(left + width - (region.x + region.width)) < snapThreshold) {
          snappedRight = region.x + region.width;
        }
        // Snap top edge
        if (Math.abs(top - region.y) < snapThreshold) {
          snappedTop = region.y;
        }
        // Snap bottom edge to top edge of existing region
        if (Math.abs(top + height - region.y) < snapThreshold) {
          snappedBottom = region.y;
        }
        // Snap top edge to bottom edge of existing region
        if (Math.abs(top - (region.y + region.height)) < snapThreshold) {
          snappedTop = region.y + region.height;
        }
        // Snap bottom edge
        if (Math.abs(top + height - (region.y + region.height)) < snapThreshold) {
          snappedBottom = region.y + region.height;
        }
      });
      
      const snappedWidth = snappedRight - snappedLeft;
      const snappedHeight = snappedBottom - snappedTop;
      
      // Store the dimensions for potential duplication
      setLastCreatedRegion({
        width: snappedWidth,
        height: snappedHeight
      });
      
      const newRegion = await addLocationRegion(locationId, {
        name: regionName,
        x: snappedLeft,
        y: snappedTop,
        width: snappedWidth,
        height: snappedHeight,
        color: regionColor.replace('#', '')
      });
      
      setRegions([...regions, newRegion]);
      setShowForm(false);
      
      // If we're in duplicate mode, keep the name for the next region
      // and increment any number at the end
      if (duplicateMode) {
        const match = regionName.match(/^(.*?)(\d+)$/);
        if (match) {
          const baseName = match[1];
          const number = parseInt(match[2], 10);
          setRegionName(`${baseName}${number + 1}`);
        } else {
          setRegionName(regionName);
        }
      } else {
        setRegionName('');
      }
    } catch (err) {
      console.error('Error creating region:', err);
      setError('Failed to create region');
    }
  };

  // Cancel region creation
  const handleCancel = () => {
    setShowForm(false);
    setRegionName('');
  };

  // Toggle duplicate mode
  const toggleDuplicateMode = () => {
    setDuplicateMode(!duplicateMode);
  };

  // Create multiple regions in a row or column
  const createMultipleRegions = async (count: number, direction: 'horizontal' | 'vertical') => {
    if (!lastCreatedRegion) {
      alert('Please create at least one region first');
      return;
    }
    
    try {
      const lastRegion = regions[regions.length - 1];
      const baseName = lastRegion.name.match(/^(.*?)(\d+)$/) 
        ? lastRegion.name.match(/^(.*?)(\d+)$/)[1] 
        : lastRegion.name;
      
      const newRegions = [];
      
      for (let i = 1; i <= count; i++) {
        let x = lastRegion.x;
        let y = lastRegion.y;
        
        if (direction === 'horizontal') {
          x = lastRegion.x + (lastRegion.width * i);
        } else {
          y = lastRegion.y + (lastRegion.height * i);
        }
        
        const newRegion = await addLocationRegion(locationId, {
          name: `${baseName}${regions.length + i}`,
          x,
          y,
          width: lastRegion.width,
          height: lastRegion.height,
          color: regionColor.replace('#', '')
        });
        
        newRegions.push(newRegion);
      }
      
      setRegions([...regions, ...newRegions]);
    } catch (err) {
      console.error('Error creating multiple regions:', err);
      setError('Failed to create multiple regions');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Region Mapper</h2>
      
      {error && <div className="p-4 text-red-500 mb-4">Error: {error}</div>}
      
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={toggleDuplicateMode}
          className={`px-3 py-1 rounded text-white ${duplicateMode ? 'bg-green-600' : 'bg-blue-500'}`}
        >
          {duplicateMode ? 'Duplicate Mode: ON' : 'Duplicate Mode: OFF'}
        </button>
        
        {lastCreatedRegion && (
          <>
            <button
              onClick={() => createMultipleRegions(3, 'vertical')}
              className="px-3 py-1 rounded bg-purple-500 text-white"
            >
              + 3 Vertikale Regionen
            </button>
            <button
              onClick={() => createMultipleRegions(3, 'horizontal')}
              className="px-3 py-1 rounded bg-purple-500 text-white"
            >
              + 3 Horizontale Regionen
            </button>
          </>
        )}
        
        <div className="flex items-center">
          <label htmlFor="regionColor" className="mr-2 text-sm">Farbe:</label>
          <input
            type="color"
            id="regionColor"
            value={regionColor}
            onChange={(e) => setRegionColor(e.target.value)}
            className="w-8 h-8 p-0 border-0"
          />
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="relative border rounded overflow-hidden mb-4"
        style={{ userSelect: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img 
          ref={imageRef}
          src={imagePath} 
          alt="Location" 
          className="w-full"
          draggable={false}
        />
        
        {/* Existing regions */}
        {regions.map((region) => (
          <div
            key={region.id}
            className="absolute border-2 bg-opacity-30"
            style={{
              left: `${region.x}px`,
              top: `${region.y}px`,
              width: `${region.width}px`,
              height: `${region.height}px`,
              borderColor: region.color ? `#${region.color}` : '#3b82f6',
              backgroundColor: region.color ? `#${region.color}33` : '#3b82f633',
            }}
          >
            <span className="absolute bottom-0 left-0 text-white text-xs px-1"
                  style={{ backgroundColor: region.color ? `#${region.color}` : '#3b82f6' }}>
              {region.name}
            </span>
          </div>
        ))}
        
        {/* Drawing rectangle */}
        <div
          className="absolute border-2 bg-opacity-30"
          style={getRectStyle()}
        />
      </div>
      
      {showForm && (
        <div className="border rounded p-4 mb-4">
          <h3 className="text-lg font-semibold mb-2">Name this region</h3>
          <form onSubmit={handleSubmit} className="flex items-center">
            <input
              type="text"
              value={regionName}
              onChange={(e) => setRegionName(e.target.value)}
              placeholder="e.g., Fach 1"
              className="border rounded px-2 py-1 flex-grow mr-2"
              autoFocus
            />
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded mr-2"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-1 rounded"
            >
              Cancel
            </button>
          </form>
        </div>
      )}
      
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Instructions</h3>
        <p className="mb-2">Click and drag on the image to define a region. After drawing, you'll be prompted to name the region.</p>
        <p className="mb-2">Regions will automatically snap to nearby edges for precise alignment.</p>
        <p className="mb-2">Use <strong>Duplicate Mode</strong> to create multiple regions of the same size.</p>
        <p>Use the <strong>+ 3 Regionen</strong> buttons to quickly create 3 identical regions in a row or column.</p>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">Defined Regions</h3>
        {regions.length === 0 ? (
          <p>No regions defined yet. Draw a region on the image to get started.</p>
        ) : (
          <ul className="list-disc pl-5">
            {regions.map((region) => (
              <li key={region.id}>{region.name}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
