"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { ImageInput } from './image-input';
import { RegionMapper } from './region-mapper';
import { useLanguage } from '@/lib/language';

interface LocationFormProps {
  parentId?: number | null;
  onSuccess?: () => void;
}

export function LocationForm({ parentId = null, onSuccess }: LocationFormProps) {
  const { t } = useLanguage();
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
      console.log('Opening RegionMapper with image:', imagePreview);
      setShowRegionMapper(!showRegionMapper);
    } else {
      console.error('Cannot define regions: No image available');
    }
  };

  const handleRegionsComplete = (definedRegions: Array<{name: string, x: number, y: number, width: number, height: number}>) => {
    console.log('Regions defined:', definedRegions);
    setRegions(definedRegions);
    setShowRegionMapper(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('locations.addNew')}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t('locations.name')} *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('locations.name')}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="locationType">{t('locations.type')} ({t('common.optional')})</Label>
          <select
            id="locationType"
            value={locationType}
            onChange={(e) => setLocationType(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{t('locations.types.selectType')}</option>
            <option value="room">{t('locations.types.room')}</option>
            <option value="cabinet">{t('locations.types.cabinet')}</option>
            <option value="drawer">{t('locations.types.drawer')}</option>
            <option value="shelf">{t('locations.types.shelf')}</option>
            <option value="box">{t('locations.types.box')}</option>
            <option value="other">{t('locations.types.other')}</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">{t('locations.description')}</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('locations.description')}
            rows={3}
          />
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image">{`${t('locations.image')} (${t('common.optional')})`}</Label>
            <div className="relative">
              <ImageInput 
                onImageChange={handleImageChange}
                initialPreview={imagePreview}
                hideLabel={true}
              />
              
              {imagePreview && (
                <div className="mt-4 relative">
                  <div className="relative border rounded-md overflow-hidden">
                    <img 
                      src={imagePreview} 
                      alt={t('locations.image')} 
                      className="max-w-full h-auto"
                    />
                    
                    {/* In-place region mapper overlay */}
                    {showRegionMapper && (
                      <div className="absolute inset-0 bg-black/50 z-10">
                        <div className="absolute inset-0">
                          <RegionMapper
                            imageSrc={imagePreview}
                            onComplete={handleRegionsComplete}
                            initialRegions={regions}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Region indicators when not in edit mode */}
                    {!showRegionMapper && regions.map((region, index) => (
                      <div 
                        key={index}
                        className="absolute border-2 border-primary bg-primary/30"
                        style={{
                          left: `${region.x}px`,
                          top: `${region.y}px`,
                          width: `${region.width}px`,
                          height: `${region.height}px`,
                        }}
                      >
                        <div className="absolute top-0 left-0 px-1 py-0.5 text-xs bg-primary text-primary-foreground">
                          {region.name}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Region controls */}
                  <div className="mt-2 flex justify-between items-center">
                    <div>
                      {regions.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {t('regions.definedRegions')}: {regions.length}
                        </div>
                      )}
                    </div>
                    <Button 
                      type="button" 
                      variant={showRegionMapper ? "secondary" : "outline"} 
                      size="sm"
                      onClick={handleDefineRegions}
                    >
                      {showRegionMapper ? t('common.done') : (regions.length > 0 ? t('common.edit') : t('regions.addNew'))}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? t('common.loading') : t('common.save')}
        </Button>
      </form>
    </div>
  );
}
