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
    
    setCurrentX(x);
    setCurrentY(y);
  };

  // Handle mouse up (finish drawing)
  const handleMouseUp = () => {
    if (!drawing) return;
    
    setDrawing(false);
    
    // Only show form if the rectangle has a minimum size
    if (Math.abs(currentX - startX) > 10 && Math.abs(currentY - startY) > 10) {
      setShowForm(true);
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
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      
      // Snap to nearby regions (simple implementation)
      const snapThreshold = 10;
      let snappedLeft = left;
      let snappedTop = top;
      let snappedRight = left + width;
      let snappedBottom = top + height;
      
      regions.forEach(region => {
        // Snap left edge
        if (Math.abs(left - region.x) < snapThreshold) {
          snappedLeft = region.x;
        }
        // Snap right edge
        if (Math.abs(left + width - (region.x + region.width)) < snapThreshold) {
          snappedRight = region.x + region.width;
        }
        // Snap top edge
        if (Math.abs(top - region.y) < snapThreshold) {
          snappedTop = region.y;
        }
        // Snap bottom edge
        if (Math.abs(top + height - (region.y + region.height)) < snapThreshold) {
          snappedBottom = region.y + region.height;
        }
      });
      
      const snappedWidth = snappedRight - snappedLeft;
      const snappedHeight = snappedBottom - snappedTop;
      
      const newRegion = await addLocationRegion(locationId, {
        name: regionName,
        x: snappedLeft,
        y: snappedTop,
        width: snappedWidth,
        height: snappedHeight,
      });
      
      setRegions([...regions, newRegion]);
      setShowForm(false);
      setRegionName('');
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

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Region Mapper</h2>
      
      {error && <div className="p-4 text-red-500 mb-4">Error: {error}</div>}
      
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
            className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30"
            style={{
              left: `${region.x}px`,
              top: `${region.y}px`,
              width: `${region.width}px`,
              height: `${region.height}px`,
            }}
          >
            <span className="absolute bottom-0 left-0 bg-blue-500 text-white text-xs px-1">
              {region.name}
            </span>
          </div>
        ))}
        
        {/* Drawing rectangle */}
        <div
          className="absolute border-2 border-green-500 bg-green-200 bg-opacity-30"
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
        <p>Regions will automatically snap to nearby edges for precise alignment.</p>
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
