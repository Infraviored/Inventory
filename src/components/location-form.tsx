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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regions, setRegions] = useState<Array<{name: string, x: number, y: number, width: number, height: number}>>([]);
  const [locationType, setLocationType] = useState<string>('');
  const [showRegionMapper, setShowRegionMapper] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<{name: string, x: number, y: number, width: number, height: number} | null>(null);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const router = useRouter();
  
  // A small transparent placeholder image as fallback (1x1 pixel transparent PNG)
  const placeholderImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

  // Simplified useEffect to control RegionMapper visibility based on stable imagePreview
  useEffect(() => {
    if (imagePreview) {
      setShowRegionMapper(true);
    } else {
      setShowRegionMapper(false);
    }
  }, [imagePreview]);

  // Function to convert blob URL to data URL for persistence
  const convertBlobToDataURL = async (blobUrl: string): Promise<string> => {
    // No try-catch here, let the caller handle errors
    console.log('Attempting to fetch blob:', blobUrl);
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch blob: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        reject(error);
      };
      reader.readAsDataURL(blob);
    });
  };

  // Handle image loading and ensure it's converted to a data URL immediately
  const handleImageChange = async (file: File | null, previewUrl?: string) => {
    setImageFile(file); // Keep the original file if available

    if (previewUrl) {
      if (previewUrl.startsWith('blob:')) {
        try {
          console.log('Converting blob URL immediately:', previewUrl);
          const dataUrl = await convertBlobToDataURL(previewUrl);
          setImagePreview(dataUrl); // Set preview to stable data URL
          console.log('Image converted and stored as data URL for preview');
          // URL.revokeObjectURL(previewUrl); // Optional: revoke if needed
        } catch (error) {
          console.error('Failed to convert blob to data URL immediately:', error);
          setImagePreview(null);
          setImageFile(null); // Clear file if conversion failed
        }
      } else {
        // Assume it's already a data URL or a usable non-blob URL
        setImagePreview(previewUrl);
      }
    } else {
      // Image cleared
      setImagePreview(null);
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
      if (parentId !== null) formData.append('parentId', parentId.toString());

      // Append image file if exists or convert from preview
      if (imageFile) {
        formData.append('image', imageFile);
      } else if (imagePreview) {
        try {
          const response = await fetch(imagePreview);
          const blob = await response.blob();
          const mimeType = imagePreview.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';
          const fileExtension = mimeType.split('/')[1] || 'jpg';
          const uploadFile = new File([blob], `image.${fileExtension}`, { type: mimeType });
          formData.append('image', uploadFile);
        } catch (error) {
          console.error('[handleSubmit] Error converting image preview data URL to file:', error);
          // Optionally handle this error, maybe notify user?
        }
      }

      // Append regions array as JSON string IF it has items
      if (regions.length > 0) {
        console.log('[handleSubmit] Adding regions to form data:', regions);
        formData.append('regions', JSON.stringify(regions));
      }
      
      // --- CHANGE: Call Next.js API route --- 
      const targetUrl = '/api/locations'; // Use relative path for Next.js API route
      console.log(`[handleSubmit] Submitting location form data to Next.js API: ${targetUrl}`);
      
      const response = await fetch(targetUrl, { // Use Next.js API endpoint
        method: 'POST',
        body: formData,
        // No Content-Type header needed here, fetch handles it for FormData
      });
      // --- END CHANGE --- 
      
      if (!response.ok) {
        let errorData = { error: 'Unknown error' };
        try {
            errorData = await response.json();
        } catch (parseError) {
            errorData.error = response.statusText;
        }
        const errorMessage = errorData.error || `Server responded with status: ${response.status}`;
        console.error(`[handleSubmit] API request failed: ${errorMessage}`);
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('[handleSubmit] Location and regions created successfully via Next.js API:', data);
      
      setName('');
      setDescription('');
      setImageFile(null);
      setImagePreview(null);
      setRegions([]);
      setLocationType('');
      if (onSuccess) {
        onSuccess();
      } else {
        // Redirect or refresh as needed
        router.push(`/locations/${data.id}`); // Redirect to the new location's page
        // router.refresh(); // Or just refresh if staying on same page
      }
    } catch (error: any) {
      console.error('Error submitting location:', error);
      alert(`${t('location_form.error')}: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegionsChange = (newRegions: Array<{name: string, x: number, y: number, width: number, height: number}>) => {
    setRegions(newRegions);
  };

  // New function to trigger drawing mode in RegionMapper
  const startDrawingNewRegion = () => {
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
                  initialPreview={null}
                  hideLabel={true}
                />
              </div>
            ) : (
              <div className="relative rounded overflow-visible" style={{ width: '100%', height: 'auto', border: '1px solid var(--border)' }}>
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
                              if (imagePreview) {
                                setShowRegionMapper(true);
                              } else {
                                console.warn("Trying to show region mapper but no imagePreview is available.");
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
                      imageSrc={imagePreview || placeholderImage}
                      initialRegions={regions}
                      onComplete={handleRegionsChange}
                      autoStartDrawing={true}
                    />
                    {/* Debug info to see if image source is available */}
                    {(!imagePreview) && (
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
