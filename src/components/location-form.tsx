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
  locationId?: number | null;
  onSuccess?: () => void;
}

export function LocationForm({ parentId = null, locationId = null, onSuccess }: LocationFormProps) {
  // --- HOOKS --- 
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
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [clearImage, setClearImage] = useState(false);
  const router = useRouter();
  
  // --- DEFINE isEditing EARLY --- 
  const isEditing = locationId !== null;

  // A small transparent placeholder image as fallback (1x1 pixel transparent PNG)
  const placeholderImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

  // Fetch location data when editing
  useEffect(() => {
    const fetchLocationData = async () => {
      if (!locationId || initialLoadComplete) return; // Only fetch if locationId is provided and not loaded yet

      console.log(`[LocationForm Edit Mode] Fetching data for location ID: ${locationId}`);
      setIsLoading(true);
      setClearImage(false); // Ensure clear flag is false on load
      try {
        // Use Promise.all for concurrent fetching
        const [locationRes, regionsRes] = await Promise.all([
          fetch(`/api/locations/${locationId}`),
          fetch(`/api/locations/${locationId}/regions`)
        ]);

        if (!locationRes.ok) {
          throw new Error(`Failed to fetch location details: ${locationRes.statusText}`);
        }
        if (!regionsRes.ok) {
          throw new Error(`Failed to fetch location regions: ${regionsRes.statusText}`);
        }

        const locationData = await locationRes.json();
        const fetchedRegions = await regionsRes.json();

        console.log('[LocationForm Edit Mode] Fetched Location:', locationData);
        console.log('[LocationForm Edit Mode] Fetched Regions:', fetchedRegions);

        // Populate form state
        setName(locationData.name || '');
        setDescription(locationData.description || '');
        setLocationType(locationData.locationType || '');
        // IMPORTANT: Set imagePreview directly from the path provided by the API
        // The API returns paths like '/uploads/xyz.png', which the browser can load directly
        setImagePreview(locationData.imagePath || null); 
        // Do NOT set imageFile here, it will be handled during submission if needed

        // Ensure fetchedRegions is an array and format matches expectations
        if (Array.isArray(fetchedRegions)) {
           // Map API response (x, y, width, height) to the state format if needed
           // Assuming the API returns regions in the correct format: {name, x, y, width, height}
           setRegions(fetchedRegions.map((r: any) => ({ // Ensure structure matches state
               name: r.name,
               x: r.x, // Ensure API returns x, y, width, height
               y: r.y,
               width: r.width,
               height: r.height
           })));
        } else {
            console.warn("Fetched regions data is not an array:", fetchedRegions);
            setRegions([]);
        }
        
        setInitialLoadComplete(true); // Mark initial load as complete

      } catch (error: any) {
        console.error('Error fetching location data:', error);
        alert(`Error loading location data: ${error.message}`);
        // Optionally redirect or show an error state
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocationData();
  // Add initialLoadComplete to dependency array to prevent re-fetch after successful load
  }, [locationId, initialLoadComplete]); 

  // Display loading indicator while fetching
  if (isLoading && locationId) {
    return <div className="text-center p-10">{t('common.loading')}</div>;
  }

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

  // Handle image loading and change clearImage logic
  const handleImageChange = async (file: File | null, previewUrl?: string) => {
    // Reset clearImage if a new file is selected
    if (file || (previewUrl && !previewUrl.startsWith('blob:'))) { 
      setClearImage(false);
    }
    setImageFile(file); 

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
        setImagePreview(previewUrl);
      }
    } else {
      // Image cleared via ImageInput component
      setImagePreview(null);
      if (isEditing) { 
        console.log("Image cleared during edit, setting clearImage flag.");
        setClearImage(true);
      }
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

      // Image handling - append new file or check clear flag
      if (imageFile) {
        formData.append('image', imageFile);
      } else if (isEditing && clearImage) {
        formData.append('clearImage', 'true');
        console.log('[handleSubmit] Sending clearImage=true flag.');
      }

      // Region handling
      if (regions.length > 0) {
        formData.append('regions', JSON.stringify(regions));
      } else if (isEditing) {
         formData.append('regions', '[]');
      }
      
      const targetUrl = isEditing ? `/api/locations/${locationId}` : '/api/locations';
      const method = isEditing ? 'PUT' : 'POST';

      console.log(`[handleSubmit] ${method} location form data to Next.js API: ${targetUrl}`);
      
      const response = await fetch(targetUrl, { method: method, body: formData });
      
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
      console.log(`[handleSubmit] Location ${isEditing ? 'updated' : 'created'} successfully via Next.js API:`, data);
      
      // Reset only for create mode (or if explicitly requested by onSuccess?)
      if (!isEditing) {
        setName('');
        setDescription('');
        setImageFile(null);
        setImagePreview(null);
        setRegions([]);
        setLocationType('');
        setClearImage(false);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        // Redirect to the updated location page after edit, or new page after create
        const resultLocationId = isEditing ? locationId : data.id; 
        router.push(`/locations/${resultLocationId}`); 
        router.refresh(); // Refresh data on the target page
      }
    } catch (error: any) {
      console.error(`Error ${isEditing ? 'updating' : 'submitting'} location:`, error);
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
                            key={`static-${i}`}
                            className="absolute border-2 border-primary dark:border-primary bg-primary/20 dark:bg-primary/20 hover:bg-primary/30 dark:hover:bg-primary/30 transition-all duration-200 cursor-pointer"
                            style={{
                              left: `${region.x}%`,
                              top: `${region.y}%`,
                              width: `${region.width}%`,
                              height: `${region.height}%`,
                            }}
                            onClick={() => {
                              setSelectedRegion(region);
                              setShowRegionMapper(true);
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
                      key={imagePreview}
                      imageSrc={imagePreview || placeholderImage}
                      initialRegions={regions}
                      onComplete={handleRegionsChange}
                      autoStartDrawing={!regions.length} // Revert autoStartDrawing logic
                    />
                    {/* Debug info to see if image source is available */}
                    {(!imagePreview) && (
                      <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded z-50">
                        {t('regions.noImage')}
                      </div>
                    )}
                    
                    {/* Add Region Button */}
                    <Button
                      type="button"
                      className={`absolute bottom-4 right-4 z-50 ${isDrawingActive ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
                      onClick={startDrawingNewRegion}
                      disabled={!imagePreview}
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
        
        <Button 
          type="submit" 
          disabled={isSubmitting || (isLoading && locationId !== null)} 
          className="w-full"
        >
          {isSubmitting ? t('common.loading') : t('common.save')}
        </Button>
      </form>
    </div>
  );
}
