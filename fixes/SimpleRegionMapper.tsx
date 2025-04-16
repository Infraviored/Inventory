"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Simple types for regions
type RegionType = {
  id?: string;  // Make id optional for compatibility
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type SimpleRegionMapperProps = {
  imageSrc: string;
  initialRegions?: RegionType[];
  onComplete: (regions: RegionType[]) => void;
};

export function SimpleRegionMapper({ 
  imageSrc, 
  initialRegions = [], 
  onComplete 
}: SimpleRegionMapperProps) {
  // State for regions
  const [regions, setRegions] = useState<RegionType[]>(initialRegions);
  // State for drawing
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [endPoint, setEndPoint] = useState<{x: number, y: number} | null>(null);
  // State for editing
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Update parent when regions change
  useEffect(() => {
    onComplete(regions);
    console.log('Updated regions:', regions);
  }, [regions, onComplete]);
  
  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (isDrawing) {
      // Start drawing a new region
      setStartPoint({ x, y });
      setEndPoint({ x, y });
    } else {
      // Check if we clicked on a region
      const clickedRegion = regions.find(r => 
        x >= r.x && x <= (r.x + r.width) && 
        y >= r.y && y <= (r.y + r.height)
      );
      
      if (clickedRegion) {
        setSelectedRegion(clickedRegion.id || null);
        setEditName(clickedRegion.name || '');
      } else {
        setSelectedRegion(null);
      }
    }
  };
  
  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPoint || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setEndPoint({ x, y });
  };
  
  // Handle mouse up
  const handleMouseUp = () => {
    if (isDrawing && startPoint && endPoint) {
      // Calculate dimensions
      const x = Math.min(startPoint.x, endPoint.x);
      const y = Math.min(startPoint.y, endPoint.y);
      const width = Math.abs(endPoint.x - startPoint.x);
      const height = Math.abs(endPoint.y - startPoint.y);
      
      // Only create if it has some size
      if (width > 10 && height > 10) {
        const newRegion = {
          id: `region-${Date.now()}`,
          name: '',
          x,
          y,
          width,
          height
        };
        
        setRegions([...regions, newRegion]);
        setSelectedRegion(newRegion.id);
        setEditName('');
      }
      
      // Reset drawing state
      setStartPoint(null);
      setEndPoint(null);
      setIsDrawing(false);
    }
  };
  
  // Handle saving region name
  const handleSaveRegionName = () => {
    if (!selectedRegion) return;
    
    const updatedRegions = regions.map(r => {
      if (r.id === selectedRegion) {
        return { ...r, name: editName };
      }
      return r;
    });
    
    setRegions(updatedRegions);
    console.log(`Region ${selectedRegion} named: "${editName}"`);
  };
  
  // Handle region deletion
  const handleDeleteRegion = (id: string) => {
    setRegions(regions.filter(r => r.id !== id));
    if (selectedRegion === id) {
      setSelectedRegion(null);
    }
  };
  
  // Calculate drawing overlay position
  const getDrawingStyle = () => {
    if (!startPoint || !endPoint) return {};
    
    return {
      left: Math.min(startPoint.x, endPoint.x),
      top: Math.min(startPoint.y, endPoint.y),
      width: Math.abs(endPoint.x - startPoint.x),
      height: Math.abs(endPoint.y - startPoint.y)
    };
  };
  
  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex justify-between mb-2">
        <Button 
          onClick={() => setIsDrawing(!isDrawing)}
          variant={isDrawing ? "secondary" : "outline"}
        >
          {isDrawing ? "Done" : "Add Region"}
        </Button>
        
        <div className="text-sm">
          {isDrawing ? "Click and drag to draw a region" : "Click on a region to select it"}
        </div>
      </div>
      
      {/* Image container */}
      <div 
        ref={containerRef}
        className="relative border rounded-md overflow-hidden"
        style={{ cursor: isDrawing ? 'crosshair' : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Image */}
        <img 
          ref={imageRef}
          src={imageSrc} 
          alt="Location" 
          className="max-w-full h-auto"
          draggable={false}
        />
        
        {/* Drawing overlay */}
        {isDrawing && startPoint && endPoint && (
          <div 
            className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30"
            style={{
              left: `${getDrawingStyle().left}px`,
              top: `${getDrawingStyle().top}px`,
              width: `${getDrawingStyle().width}px`,
              height: `${getDrawingStyle().height}px`
            }}
          />
        )}
        
        {/* Regions */}
        {regions.map(region => (
          <div 
            key={region.id}
            className={`absolute border-2 ${
              selectedRegion === region.id ? 'border-yellow-500 bg-yellow-200 bg-opacity-30' : 'border-blue-500 bg-blue-200 bg-opacity-30'
            }`}
            style={{
              left: `${region.x}px`,
              top: `${region.y}px`,
              width: `${region.width}px`,
              height: `${region.height}px`,
              cursor: 'pointer'
            }}
          >
            <div className="absolute top-0 left-0 bg-white text-xs p-1">
              {region.name || 'Unnamed'}
            </div>
          </div>
        ))}
      </div>
      
      {/* Region editing */}
      {selectedRegion && (
        <div className="p-4 border rounded bg-gray-50">
          <h3 className="font-bold mb-2">Edit Region</h3>
          
          <div className="flex gap-2 mb-4">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter region name"
              className="flex-grow"
            />
            <Button onClick={handleSaveRegionName}>
              Save Name
            </Button>
            <Button 
              variant="destructive"
              onClick={() => handleDeleteRegion(selectedRegion)}
            >
              Delete
            </Button>
          </div>
          
          <div className="text-xs">
            ID: {selectedRegion}<br />
            Name: {regions.find(r => r.id === selectedRegion)?.name || 'Unnamed'}<br />
            Position: ({Math.round(regions.find(r => r.id === selectedRegion)?.x || 0)}, 
            {Math.round(regions.find(r => r.id === selectedRegion)?.y || 0)})
          </div>
        </div>
      )}
      
      {/* Debug info */}
      <div className="p-4 border rounded bg-gray-50 text-xs">
        <details>
          <summary className="font-bold cursor-pointer">Debug Info</summary>
          <div className="mt-2">
            <pre>{JSON.stringify(regions, null, 2)}</pre>
          </div>
        </details>
      </div>
    </div>
  );
} 