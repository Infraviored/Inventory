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
import { XIcon, PlusIcon } from 'lucide-react';

// Custom wrapper to constrain RegionMapper to fixed dimensions
function FixedSizeRegionMapper({
  imageSrc, 
  initialRegions, 
  onComplete, 
  autoStartDrawing
}: {
  imageSrc: string;
  initialRegions: Array<{name: string, x: number, y: number, width: number, height: number}>;
  onComplete: (regions: Array<{name: string, x: number, y: number, width: number, height: number}>) => void;
  autoStartDrawing?: boolean;
}) {
  const { t } = useLanguage();
  
  // Add CSS to ensure RegionMapper's image uses object-contain scaling
  useEffect(() => {
    // Add a style tag to force the RegionMapper's image to use object-contain
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
      .region-mapper img {
        object-fit: contain !important;
        width: auto !important;
        height: auto !important;
        max-width: 100% !important;
        max-height: 100vh !important;
      }
      .region-mapper .relative.border.rounded-md.overflow-hidden,
      .region-mapper .relative.border.border-border.rounded-md.overflow-hidden.dark\\:border-border {
        width: 100% !important;
        height: auto !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      .region-mapper .text-destructive {
        color: var(--destructive) !important;
      }
      .region-mapper .dark\\:text-red-400 {
        color: #f87171 !important;
      }
      .region-mapper .text-emerald-600 {
        color: #059669 !important;
      }
      .region-mapper .dark\\:text-emerald-400 {
        color: #34d399 !important;
      }
      .region-mapper .bg-background {
        background-color: var(--background) !important;
      }
      .region-mapper .text-foreground {
        color: var(--foreground) !important;
      }
    `;
    document.head.appendChild(styleTag);
    
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  return (
    <div className="relative region-mapper" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      <RegionMapper
        key="region-mapper"
        imageSrc={imageSrc}
        initialRegions={initialRegions}
        onComplete={onComplete}
        autoStartDrawing={autoStartDrawing}
      />
    </div>
  );
}

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
  const [regions, setRegions] = useState<Array<{name: string, x: number, y: number, width: number, height: number}>>([]);
  const [locationType, setLocationType] = useState<string>('');
  const [showRegionMapper, setShowRegionMapper] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<{name: string, x: number, y: number, width: number, height: number} | null>(null);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const router = useRouter();
  const imageUrlRef = useRef<string | null>(null);
  // Store the actual image file data
  const [imageData, setImageData] = useState<string | null>(null);
  
  // A small transparent placeholder image as fallback (1x1 pixel transparent PNG)
  const placeholderImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

  // Auto-show the RegionMapper whenever an image is available
  useEffect(() => {
    if (imagePreview) {
      // Automatically show RegionMapper whenever an image is available
      setShowRegionMapper(true);
      
      // Ensure image data is converted if needed
      if (!imageData && imagePreview.startsWith('blob:')) {
        convertBlobToDataURL(imagePreview).then(dataUrl => {
          setImageData(dataUrl);
          imageUrlRef.current = dataUrl;
        }).catch(err => {
          console.error('Failed to convert image:', err);
          setImageData(imagePreview);
          imageUrlRef.current = imagePreview;
        });
      }
    }
  }, [imagePreview]);

  // Function to convert blob URL to data URL for persistence
  const convertBlobToDataURL = async (blobUrl: string): Promise<string> => {
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting blob to data URL:', error);
      return blobUrl; // Return original as fallback
    }
  };

  // Handle image loading and ensure it's converted to a data URL
  const handleImageChange = async (file: File | null, croppedImage?: string) => {
    setImage(file);
    setImagePreview(croppedImage || null);
    
    if (croppedImage && croppedImage.startsWith('blob:')) {
      try {
        // Convert to data URL right away
        const dataUrl = await convertBlobToDataURL(croppedImage);
        setImageData(dataUrl);
        imageUrlRef.current = dataUrl;
        console.log('Image converted and stored as data URL');
      } catch (error) {
        console.error('Failed to convert image:', error);
        setImageData(croppedImage);
        imageUrlRef.current = croppedImage;
      }
    } else if (croppedImage) {
      setImageData(croppedImage);
      imageUrlRef.current = croppedImage;
    }
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
      
      // Ensure image is included in the form data
      if (image) {
        console.log('Adding image to form data:', image.name);
        formData.append('image', image);
      } else if (imagePreview) {
        // If we have an image preview but no File object, convert the data URL to a File
        console.log('Converting image preview to file');
        try {
          const response = await fetch(imagePreview);
          const blob = await response.blob();
          const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
          formData.append('image', file);
        } catch (error) {
          console.error('Error converting image preview to file:', error);
        }
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
        
        // Save regions sequentially instead of using Promise.all
        let failedCount = 0;
        for (const region of regions) {
          try {
            const response = await fetch(`/api/locations/${data.id}/regions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(region),
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Failed to save region: ${errorText}`);
              failedCount++;
            } else {
              console.log(`Region "${region.name}" saved successfully`);
            }
          } catch (error) {
            console.error('Error saving region:', error);
            failedCount++;
          }
        }
        
        if (failedCount > 0) {
          console.error(`${failedCount} regions failed to save`);
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

  const handleRegionsChange = (newRegions: Array<{name: string, x: number, y: number, width: number, height: number}>) => {
    setRegions(newRegions);
  };

  // New function to trigger drawing mode in RegionMapper
  const startDrawingNewRegion = () => {
    // Add a custom event that the RegionMapper can listen for
    const event = new CustomEvent('startDrawingRegion', { bubbles: true });
    document.dispatchEvent(event);
    setIsDrawingActive(true);
  };

  // Listen for when drawing is completed
  useEffect(() => {
    const handleDrawingComplete = () => setIsDrawingActive(false);
    document.addEventListener('drawingComplete', handleDrawingComplete);
    return () => document.removeEventListener('drawingComplete', handleDrawingComplete);
  }, []);

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="w-full mb-6">
        <div className="flex justify-between mb-2">
          <div className={`text-sm font-medium ${!imagePreview ? 'text-primary dark:text-primary' : 'text-foreground'}`}>
            {t('form.steps.basicInfo')}
          </div>
          <div className={`text-sm font-medium ${imagePreview && !regions.length ? 'text-primary dark:text-primary' : 'text-foreground'}`}>
            {t('form.steps.image')}
          </div>
          <div className={`text-sm font-medium ${regions.length > 0 ? 'text-primary dark:text-primary' : 'text-foreground'}`}>
            {t('form.steps.regions')}
          </div>
        </div>
        <div className="w-full bg-muted dark:bg-muted rounded-full h-2.5">
          <div 
            className="bg-primary dark:bg-primary h-2.5 rounded-full transition-all duration-300"
            style={{ 
              width: imagePreview 
                ? regions.length > 0 
                  ? '100%' 
                  : '66%' 
                : '33%' 
            }}
          ></div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t('common.fields.name')} *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('common.fields.name')}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="locationType">{t('locations.type')} ({t('common.optional')})</Label>
          <select
            id="locationType"
            value={locationType}
            onChange={(e) => setLocationType(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-border"
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
          <Label htmlFor="description">{t('common.fields.description')}</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('common.fields.description')}
            rows={3}
          />
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image">{`${t('common.fields.image')} (${t('common.optional')})`}</Label>
            
            {!imagePreview ? (
              <div className="flex flex-col items-center justify-center border border-dashed border-border rounded-md bg-muted/50 dark:bg-muted/20 dark:border-border p-6 text-center">
                <div className="mb-4">
                  <div className="text-lg font-medium mb-2 text-foreground">{t('locations.uploadImage')}</div>
                  <p className="text-muted-foreground mb-4">{t('locations.imageInstructions')}</p>
                </div>
                <ImageInput 
                  onImageChange={handleImageChange}
                  initialPreview={imagePreview}
                  hideLabel={true}
                />
              </div>
            ) : (
              <div className="relative rounded overflow-visible" style={{ width: '100%', height: 'auto', border: '1px solid var(--border)' }}>
                {/* Hide the image when RegionMapper is displayed */}
                {!showRegionMapper ? (
                  <>
                    <img 
                      src={imagePreview} 
                      alt={t('locations.imagePreview')}
                      className="object-contain w-full bg-background dark:bg-muted"
                      style={{ maxHeight: '80vh' }}
                    />
                    
                    {!regions.length && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 text-white p-6 text-center dark:bg-black dark:bg-opacity-60">
                        <div className="bg-black bg-opacity-70 p-6 rounded-lg max-w-md dark:bg-black/80">
                          <p className="text-xl font-bold mb-2">{t('regions.defineAreas')}</p>
                          <p className="mb-4">{t('regions.defineAreasDescription')}</p>
                          <Button
                            type="button"
                            className="flex items-center"
                            onClick={() => setShowRegionMapper(true)}
                          >
                            <PlusIcon className="w-5 h-5 mr-2" /> 
                            {t('regions.startDefining')}
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {regions.length > 0 && (
                      <div className="absolute inset-0">
                        {regions.map((region, i) => (
                          <div
                            key={i}
                            className="absolute border-2 border-primary dark:border-primary bg-primary/20 dark:bg-primary/20 hover:bg-primary/30 dark:hover:bg-primary/30 transition-all duration-200 cursor-pointer"
                            style={{
                              left: `${region.x}%`,
                              top: `${region.y}%`,
                              width: `${region.width}%`,
                              height: `${region.height}%`,
                            }}
                            onClick={() => {
                              setSelectedRegion(region);
                              // Ensure image data is available before showing mapper
                              if (!imageData && imagePreview) {
                                convertBlobToDataURL(imagePreview).then(dataUrl => {
                                  setImageData(dataUrl);
                                  setShowRegionMapper(true);
                                }).catch(err => {
                                  console.error('Failed to convert image before showing RegionMapper:', err);
                                  setImageData(imagePreview);
                                  setShowRegionMapper(true);
                                });
                              } else {
                                setShowRegionMapper(true);
                              }
                            }}
                          >
                            <div className="absolute top-0 left-0 bg-primary dark:bg-primary text-primary-foreground text-xs px-1">
                              {region.name || `${t('regions.region')} ${i + 1}`}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <div className="bg-primary/70 dark:bg-primary/70 text-primary-foreground rounded-md px-2 py-1 text-xs shadow-md">
                                {t('regions.clickToEdit')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-background dark:bg-background" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                    <FixedSizeRegionMapper
                      imageSrc={imageData || imageUrlRef.current || placeholderImage}
                      initialRegions={regions}
                      onComplete={handleRegionsChange}
                      autoStartDrawing={true}
                    />
                    {/* Debug info to see if image source is available */}
                    {(!imageData && !imageUrlRef.current) && (
                      <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded z-50">
                        {t('regions.noImage')}
                      </div>
                    )}
                    
                    {/* Add Region Button - Always visible while RegionMapper is open */}
                    <Button
                      type="button"
                      className={`absolute bottom-4 right-4 z-50 ${isDrawingActive ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
                      onClick={startDrawingNewRegion}
                    >
                      <PlusIcon className="w-4 h-4 mr-1" /> {isDrawingActive ? t('regions.drawing') : t('regions.addRegion')}
                    </Button>
                  </div>
                )}
                
                {/* Region count indicator - Always shown even when the mapper is open */}
                {regions.length > 0 && (
                  <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-sm px-2 py-1 rounded-full z-50">
                    {regions.length} {regions.length === 1 ? t('regions.regionSingular') : t('regions.regionPlural')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? t('common.loading') : t('common.save')}
        </Button>
      </form>
    </div>
  );
}
