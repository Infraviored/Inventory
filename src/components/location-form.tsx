"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { ImageInput } from './image-input';
import { RegionMapper } from './region-mapper';

interface LocationFormProps {
  parentId?: number | null;
  onSuccess?: () => void;
}

export function LocationForm({ parentId = null, onSuccess }: LocationFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regions, setRegions] = useState<Array<{name: string, x: number, y: number, width: number, height: number}>>([]);
  const [locationType, setLocationType] = useState<string>('');
  const router = useRouter();

  const handleImageChange = (file: File | null, croppedImage?: string) => {
    setImage(file);
    setImagePreview(croppedImage || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('locationType', locationType);
      
      if (parentId !== null) {
        formData.append('parentId', parentId.toString());
      }
      
      if (image) {
        formData.append('image', image);
      }
      
      // Add regions data if available
      if (regions.length > 0) {
        console.log('Saving location with regions:', regions);
        formData.append('regions', JSON.stringify(regions));
      }
      
      console.log('Submitting location form data');
      const response = await fetch('/api/locations', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.error || `Server responded with status: ${response.status}`;
        console.error('API request failed:', errorMessage);
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Location created successfully:', data);
      
      // If we have regions, save them
      if (regions.length > 0 && data.id) {
        console.log(`Saving ${regions.length} regions for location ID ${data.id}`);
        const regionsPromises = regions.map(region => 
          fetch(`/api/locations/${data.id}/regions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(region),
          })
        );
        
        const regionsResults = await Promise.all(regionsPromises);
        
        // Check if any region creation failed
        const failedRegions = regionsResults.filter(res => !res.ok);
        if (failedRegions.length > 0) {
          console.error(`${failedRegions.length} regions failed to save`);
        } else {
          console.log('All regions saved successfully');
        }
      }
      
      setName('');
      setDescription('');
      setImage(null);
      setImagePreview(null);
      setRegions([]);
      setLocationType('');
      
      if (onSuccess) {
        onSuccess();
      }
      
      router.refresh();
    } catch (error) {
      console.error('Error creating location:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegionsComplete = (definedRegions: Array<{name: string, x: number, y: number, width: number, height: number}>) => {
    console.log('Regions defined:', definedRegions);
    setRegions(definedRegions);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Neuen Ort hinzufügen</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Wohnzimmer, Schrank 1"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="locationType">Typ (optional)</Label>
          <select
            id="locationType"
            value={locationType}
            onChange={(e) => setLocationType(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Bitte wählen...</option>
            <option value="room">Raum</option>
            <option value="cabinet">Schrank</option>
            <option value="drawer">Schublade</option>
            <option value="shelf">Regal</option>
            <option value="box">Box</option>
            <option value="other">Sonstiges</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Beschreibung</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optionale Beschreibung"
            rows={3}
          />
        </div>
        
        <div className="space-y-4">
          <ImageInput 
            onImageChange={handleImageChange}
            label="Bild (optional)"
            initialPreview={imagePreview}
          />
          
          {imagePreview && (
            <RegionMapper
              imageSrc={imagePreview}
              onComplete={handleRegionsComplete}
              initialRegions={regions}
            />
          )}
        </div>
        
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Wird gespeichert...' : 'Speichern'}
        </Button>
      </form>
    </div>
  );
}
