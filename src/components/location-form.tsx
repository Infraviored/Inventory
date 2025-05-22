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

// --- Type Definitions --- 
// (These should ideally be in a shared types file)
interface LocationRegion {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
}
interface Location {
    id: number;
    name: string;
    description: string | null;
    parentId: number | null;
    imagePath: string | null;
    locationType: string | null;
    createdAt?: string; // Optional fields from DB
    updatedAt?: string;
}
interface LocationDetails extends Location {
    regions: LocationRegion[];
}

// Custom wrapper to constrain RegionMapper to fixed dimensions
function FixedSizeRegionMapper({
  imageSrc, 
  initialRegions, 
  onComplete, 
  autoStartDrawing
}: {
  imageSrc: string;
  initialRegions: LocationRegion[];
  onComplete: (regions: LocationRegion[]) => void;
  autoStartDrawing?: boolean;
}) {
  const { t } = useLanguage();
  
  // Add CSS to ensure RegionMapper's image uses object-contain scaling
  useEffect(() => {
    // Add a style tag to force the RegionMapper's image to use object-contain
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
      /* .region-mapper img removed - conflicting with RegionMapper component styles */
      .region-mapper .relative.border.rounded-md.overflow-hidden,
      .region-mapper .relative.border.border-border.rounded-md.overflow-hidden.dark\\:border-border {
        width: 100% !important;
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
      /* REMOVED unnecessary forced background
      .region-mapper .bg-background {
        background-color: var(--background) !important;
      }
      */
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

// --- LocationForm Props --- 
// Define the explicit shape LocationForm expects for its initial data
interface LocationFormInitialData {
    id: number;
    name: string;
    description: string | null;
    locationType: string | null;
    imagePath: string | null;
    parentId: number | null;
    regions: LocationRegion[]; // Use the existing LocationRegion type
}

interface LocationFormProps {
  parentId?: number | null;
  locationId?: number | null; 
  initialData?: LocationFormInitialData | null; // Use the new specific type
  onSuccess?: () => void;
}

export function LocationForm({ 
    parentId = null, 
    locationId = null, 
    initialData = null, // Prop type updated
    onSuccess 
}: LocationFormProps) {
  // --- HOOKS --- 
  const { t } = useLanguage();
  const router = useRouter(); // Keep for potential redirects

  // Form state - Initialized based on initialData later
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locationType, setLocationType] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null); // For new uploads
  const [imagePreview, setImagePreview] = useState<string | null>(null); // Current image shown
  const [regions, setRegions] = useState<LocationRegion[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clearImage, setClearImage] = useState(false); // Flag to signal image removal on submit
  
  // Region Mapper related state
  const [showRegionMapper, setShowRegionMapper] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<LocationRegion | null>(null);
  const [isDrawingActive, setIsDrawingActive] = useState(false);

  // --- Determine edit mode --- 
  const isEditing = locationId !== null;

  // Placeholder image remains the same
  const placeholderImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

  // --- Effect to initialize state from initialData --- 
  useEffect(() => {
    console.log("[LocationForm] Initializing state with initialData:", initialData);
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setLocationType(initialData.locationType || '');
      if (initialData.imagePath) {
        // Transform to API path if it's in 'category/filename' format
        const parts = initialData.imagePath.split('/');
        if (parts.length === 2 && parts[0] && parts[1] && !initialData.imagePath.startsWith('/')) {
          setImagePreview(`/api/images/${initialData.imagePath}`);
        } else {
          setImagePreview(initialData.imagePath); // Assume it's already a full URL or blob
        }
      } else {
        setImagePreview(null);
      }
      setRegions(Array.isArray(initialData.regions) ? initialData.regions : []);
      
      // Show mapper immediately if editing with an image 
      setShowRegionMapper(!!initialData.imagePath);
      
      // Reset other flags
      setImageFile(null); 
      setClearImage(false); 
      setSelectedRegion(null);
    } else {
      // Reset form for create mode 
      setName('');
      setDescription('');
      setLocationType('');
      setImagePreview(null);
      setRegions([]);
      setImageFile(null);
      setClearImage(false);
      setShowRegionMapper(false); // Ensure mapper is hidden for create mode initially
    }
  }, [initialData]);

  // Function to convert blob URL remains the same
  const convertBlobToDataURL = async (blobUrl: string): Promise<string> => {
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

  // Handle image loading and change clearImage logic (mostly unchanged)
  const handleImageChange = async (file: File | null, previewUrl?: string) => {
    if (file || (previewUrl && !previewUrl.startsWith('blob:'))) { 
      setClearImage(false); // Reset clear flag if new image selected
    }
    setImageFile(file); 

    // previewUrl from ImageInput will be a blob URL (for new files) 
    // or the processed API path (for initial images from initialImageUrl).
    setImagePreview(previewUrl || null); 
    
    // No need to convert blob to data URL here anymore if ImageInput provides usable preview URLs
    // if (previewUrl) {
    //   if (previewUrl.startsWith('blob:')) {
    //     try {
    //       // Convert blob immediately for stability
    //       console.log('Converting blob URL immediately:', previewUrl);
    //       const dataUrl = await convertBlobToDataURL(previewUrl);
    //       setImagePreview(dataUrl);
    //       console.log('Image converted and stored as data URL for preview');
    //     } catch (error) {
    //       console.error('Failed to convert blob to data URL immediately:', error);
    //       setImagePreview(null);
    //       setImageFile(null);
    //     }
    //   } else {
    //     // Use provided non-blob URL directly
    //     setImagePreview(previewUrl);
    //   }
    // } else {
    //   // Image cleared via ImageInput component
    //   setImagePreview(null);
    //   if (isEditing) { 
    //     console.log("Image cleared during edit, setting clearImage flag.");
    //     setClearImage(true);
    //   }
    // }
  };

  // handleSubmit remains largely the same, using isEditing flag
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
        // Only send clearImage flag if editing and flag is true
        formData.append('clearImage', 'true');
        console.log('[handleSubmit] Sending clearImage=true flag.');
      }

      // Region handling - always send regions array (even if empty)
      formData.append('regions', JSON.stringify(regions));
      
      // Determine URL and Method based on isEditing
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
      
      // Reset form fields only if CREATING a new location successfully
      // In edit mode, parent component handles closing dialog, no need to reset here
      if (!isEditing) {
          // No need to reset here if onSuccess is called, parent handles state.
          // If needed, add reset logic here for standalone create form.
      }

      // Call onSuccess callback (provided by parent)
      if (onSuccess) {
        onSuccess();
      } else {
        // Fallback redirect if no onSuccess provided (less common with dialogs)
        const resultLocationId = isEditing ? locationId : data.id; 
        router.push(`/locations/${resultLocationId}`); 
        router.refresh();
      }
    } catch (error: any) {
      console.error(`Error ${isEditing ? 'updating' : 'submitting'} location:`, error);
      alert(`${t('location_form.error')}: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // handleRegionsChange remains the same
  const handleRegionsChange = (newRegions: LocationRegion[]) => {
    setRegions(newRegions);
  };

  // startDrawingNewRegion remains the same
  const startDrawingNewRegion = () => {
    const event = new CustomEvent('startDrawingRegion', { bubbles: true });
    document.dispatchEvent(event);
    setIsDrawingActive(true);
  };

  // drawingComplete listener remains the same
  useEffect(() => {
    const handleDrawingComplete = () => setIsDrawingActive(false);
    document.addEventListener('drawingComplete', handleDrawingComplete);
    return () => document.removeEventListener('drawingComplete', handleDrawingComplete);
  }, []);

  // --- RETURN JSX --- 
  // (JSX structure remains largely the same, but button disabled logic changes)
  return (
    <div className="space-y-6">
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

      <form onSubmit={handleSubmit} className="flex flex-col space-y-4 h-full flex-grow">
        <div className="space-y-4 flex-shrink-0">
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
        </div>
        
        <div className="space-y-2 flex-grow min-h-0">
          <div className="flex items-center gap-2 mb-1">
            <Label htmlFor="image">{t('common.fields.image')}
                {!imagePreview && <span className="text-xs text-muted-foreground ml-1">({t('common.optional')})</span>}
            </Label>
            {imagePreview && (
                 <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-destructive dark:hover:text-destructive-foreground"
                    onClick={() => handleImageChange(null, undefined)} 
                    aria-label={t('common.clearImage') || "Clear image"}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
            )}
          </div>
            
            {!imagePreview ? (
              <div className="flex flex-col items-center justify-center border border-dashed border-border rounded-md bg-muted/50 dark:bg-muted/20 dark:border-border p-6 text-center h-full">
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
              <div className="relative rounded border border-border overflow-hidden h-full flex flex-col">
                
                <div className="relative flex-grow min-h-0 flex items-center justify-center">
                  <FixedSizeRegionMapper
                    imageSrc={imagePreview || placeholderImage} 
                    initialRegions={regions}
                    onComplete={handleRegionsChange}
                    autoStartDrawing={!isEditing && !regions.length} 
                  />
                  
                  {(!imagePreview) && (
                    <div className="absolute top-12 left-4 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded z-50">
                      {t('regions.noImage')}
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
        
        <div className="flex-shrink-0 pt-4">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? t('common.loading') : t('common.save')}
            </Button>
        </div>
      </form>
    </div>
  );
}
