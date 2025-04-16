"use client";

import React, { useState } from 'react';
import { SimpleRegionMapper } from './SimpleRegionMapper';
import { Button } from '@/components/ui/button';

// This is a standalone demo page for testing the SimpleRegionMapper
export default function RegionMapperDemo() {
  const [regions, setRegions] = useState<any[]>([]);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  
  // Sample image
  const imageSrc = "/placeholder-image.jpg";
  
  const handleRegionsUpdate = (updatedRegions: any[]) => {
    setRegions(updatedRegions);
    console.log("Regions updated:", updatedRegions);
  };
  
  const handleSave = () => {
    setLastSaved(JSON.stringify(regions, null, 2));
    alert(`Saved ${regions.length} regions!`);
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Region Mapper Demo</h1>
      <p className="mb-4">
        This is a standalone demo of the SimpleRegionMapper component. 
        Draw regions on the image, name them, and save the result.
      </p>
      
      <div className="border rounded p-4 bg-white">
        <SimpleRegionMapper
          imageSrc={imageSrc}
          onComplete={handleRegionsUpdate}
          initialRegions={[]}
        />
      </div>
      
      <div className="mt-4 flex gap-2">
        <Button onClick={handleSave}>
          Save Regions
        </Button>
        <Button 
          variant="outline"
          onClick={() => setRegions([])}
        >
          Clear All
        </Button>
      </div>
      
      {lastSaved && (
        <div className="mt-4">
          <h3 className="font-bold">Last Saved Data:</h3>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
            {lastSaved}
          </pre>
        </div>
      )}
    </div>
  );
} 