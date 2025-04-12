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
  const [showRegionMapper, setShowRegionMapper] = useState(false);
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
        formData.append('regions', JSON.stringify(regions));
      }
      
      const response = await fetch('/api/locations', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to create location');
      }
      
      const data = await response.json();
      
      // If we have regions, save them
      if (regions.length > 0 && data.id) {
        const regionsPromises = regions.map(region => 
          fetch(`/api/locations/${data.id}/regions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(region),
          })
        );
        
        await Promise.all(regionsPromises);
      }
      
      setName('');
      setDescription('');
      setImage(null);
      setImagePreview(null);
      setRegions([]);
      setLocationType('');
      setShowRegionMapper(false);
      
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

  const handleDefineRegions = () => {
    if (imagePreview) {
      setShowRegionMapper(true);
    }
  };

  const handleRegionsComplete = (definedRegions: Array<{name: string, x: number, y: number, width: number, height: number}>) => {
    setRegions(definedRegions);
    setShowRegionMapper(false);
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
        
        <ImageInput 
          onImageChange={handleImageChange}
          label="Bild (optional)"
          initialPreview={imagePreview}
        />
        
        {imagePreview && !showRegionMapper && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleDefineRegions}
            className="w-full"
          >
            Regionen auf dem Bild definieren
          </Button>
        )}
        
        {showRegionMapper && imagePreview && (
          <RegionMapper
            imageSrc={imagePreview}
            onComplete={handleRegionsComplete}
            initialRegions={regions}
          />
        )}
        
        {regions.length > 0 && !showRegionMapper && (
          <div className="p-4 border rounded-md bg-muted">
            <h3 className="font-medium mb-2">Definierte Regionen ({regions.length})</h3>
            <ul className="list-disc pl-5 space-y-1">
              {regions.map((region, index) => (
                <li key={index}>{region.name}</li>
              ))}
            </ul>
            <Button 
              type="button" 
              variant="link" 
              onClick={handleDefineRegions}
              className="mt-2 p-0 h-auto"
            >
              Regionen bearbeiten
            </Button>
          </div>
        )}
        
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Wird gespeichert...' : 'Speichern'}
        </Button>
      </form>
    </div>
  );
}
