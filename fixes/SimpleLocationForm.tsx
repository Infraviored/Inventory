"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SimpleRegionMapper } from './SimpleRegionMapper';

// Simple types
type Region = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type SimpleLocationFormProps = {
  locationId?: number;
  parentId?: number;
  imageSrc?: string;
  onSave: (data: FormData) => void;
  onCancel: () => void;
};

export function SimpleLocationForm({
  locationId,
  parentId,
  imageSrc = '/placeholder-image.jpg',
  onSave,
  onCancel
}: SimpleLocationFormProps) {
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [regions, setRegions] = useState<Region[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(imageSrc);
  
  // Handle regions update from the mapper
  const handleRegionsUpdate = (updatedRegions: Region[]) => {
    setRegions(updatedRegions);
    console.log("Regions updated:", updatedRegions);
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData();
    
    // Add basic fields
    formData.append('name', name);
    formData.append('description', description);
    if (parentId) {
      formData.append('parentId', parentId.toString());
    }
    
    // Add regions if there are any
    if (regions.length > 0) {
      formData.append('regions', JSON.stringify(regions));
    }
    
    // Submit the form
    onSave(formData);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{locationId ? 'Edit Location' : 'Add New Location'}</CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter location name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description"
                className="h-24"
              />
            </div>
          </div>
          
          {/* Region mapper */}
          <div>
            <label className="block text-sm font-medium mb-1">Define Regions</label>
            <div className="border rounded p-4">
              <SimpleRegionMapper
                imageSrc={imagePreview || imageSrc}
                onComplete={handleRegionsUpdate}
                initialRegions={regions}
              />
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Define regions by drawing on the image. Click and drag to create regions.
            </div>
          </div>
          
          {/* Buttons */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              Save Location
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 