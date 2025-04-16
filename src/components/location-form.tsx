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
  // Add CSS to ensure RegionMapper's image uses object-contain scaling
  useEffect(() => {
    // Add a style tag to force the RegionMapper's image to use object-contain
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
      .region-mapper img {
        object-fit: contain !important;
        width: 100% !important;
        height: 100% !important;
        max-height: 400px !important;
      }
      .region-mapper .relative.border.rounded-md.overflow-hidden {
        width: 100% !important;
        height: 100% !important;
        max-height: 400px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
    `;
    document.head.appendChild(styleTag);
    
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  return (
    <div className="relative region-mapper" style={{ maxWidth: '100%', height: '100%', overflow: 'hidden' }}>
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
  const router = useRouter();
  const imageUrlRef = useRef<string | null>(null);
  // Store the actual image file data
  const [imageData, setImageData] = useState<string | null>(null);
  
  // A small transparent placeholder image as fallback (1x1 pixel transparent PNG)
  const placeholderImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

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

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="w-full mb-6">
        <div className="flex justify-between mb-2">
          <div className={`text-sm font-medium ${!imagePreview ? 'text-blue-500' : ''}`}>{t('form.steps.basicInfo') || 'Basic Info'}</div>
          <div className={`text-sm font-medium ${imagePreview && !regions.length ? 'text-blue-500' : ''}`}>{t('form.steps.image') || 'Image'}</div>
          <div className={`text-sm font-medium ${regions.length > 0 ? 'text-blue-500' : ''}`}>{t('form.steps.regions') || 'Regions'}</div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
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
            
            {!imagePreview ? (
              <div className="flex flex-col items-center justify-center h-[400px] border border-dashed border-gray-300 rounded-md bg-gray-50 p-6 text-center">
                <div className="mb-4">
                  <div className="text-lg font-medium mb-2">{t('locations.uploadImage') || 'Upload an Image'}</div>
                  <p className="text-gray-500 mb-4">{t('locations.imageInstructions') || 'Upload an image to add regions and create a visual map of your location.'}</p>
                </div>
                <ImageInput 
                  onImageChange={handleImageChange}
                  initialPreview={imagePreview}
                  hideLabel={true}
                />
              </div>
            ) : (
              <div className="relative rounded overflow-hidden" style={{ maxWidth: '100%', height: '400px', border: '1px solid #ccc' }}>
                {/* Hide the image when RegionMapper is displayed */}
                {!showRegionMapper ? (
                  <>
                    <img 
                      src={imagePreview} 
                      alt={t('locations.imagePreview') || "Location preview"}
                      className="object-contain w-full h-full"
                    />
                    
                    {!regions.length && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 text-white p-6 text-center">
                        <div className="bg-black bg-opacity-50 p-6 rounded-lg max-w-md">
                          <p className="text-xl font-bold mb-2">{t('regions.defineAreas') || 'Define Areas'}</p>
                          <p className="mb-4">{t('regions.defineAreasDescription') || 'Mark important areas on your image to make items easier to find.'}</p>
                          <button
                            type="button"
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center justify-center mx-auto"
                            onClick={() => setShowRegionMapper(true)}
                          >
                            <PlusIcon className="w-5 h-5 mr-2" /> 
                            {t('regions.startDefining') || 'Start Defining Regions'}
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {regions.length > 0 && (
                      <div className="absolute inset-0">
                        {regions.map((region, i) => (
                          <div
                            key={i}
                            className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30 hover:bg-blue-300 hover:bg-opacity-40 transition-all duration-200 cursor-pointer"
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
                            <div className="absolute top-0 left-0 bg-blue-500 text-white text-xs px-1">
                              {region.name || `${t('regions.region') || 'Region'} ${i + 1}`}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <div className="bg-blue-600 bg-opacity-70 text-white rounded-md px-2 py-1 text-xs shadow-md">
                                {t('regions.clickToEdit') || 'Click to edit'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 bg-white z-10" style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
                    <FixedSizeRegionMapper
                      imageSrc={imageData || imageUrlRef.current || placeholderImage}
                      initialRegions={regions}
                      onComplete={handleRegionsChange}
                      autoStartDrawing={true}
                    />
                    {/* Debug info to see if image source is available */}
                    {(!imageData && !imageUrlRef.current) && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded z-50">
                        Image data not available. Please try uploading again.
                      </div>
                    )}
                  </div>
                )}
                
                {/* Toggle button for RegionMapper */}
                <button
                  type="button"
                  className="absolute bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md flex items-center z-50"
                  onClick={() => {
                    // Only toggle if we have a valid image
                    if (!showRegionMapper && !imageData && imagePreview) {
                      // Try to convert if we don't have image data yet
                      convertBlobToDataURL(imagePreview).then(dataUrl => {
                        setImageData(dataUrl);
                        setShowRegionMapper(true);
                      }).catch(err => {
                        console.error('Failed to convert image before showing RegionMapper:', err);
                        // Try to show anyway with original preview
                        setImageData(imagePreview);
                        setShowRegionMapper(true);
                      });
                    } else {
                      setShowRegionMapper(!showRegionMapper);
                    }
                  }}
                >
                  {showRegionMapper ? (
                    <>
                      <XIcon className="w-4 h-4 mr-1" /> {t('regions.closeEditor') || 'Close Region Editor'}
                    </>
                  ) : (
                    <>
                      <PlusIcon className="w-4 h-4 mr-1" /> {regions.length > 0 ? t('regions.editRegions') || 'Edit Regions' : t('regions.addRegion') || 'Add Region'}
                    </>
                  )}
                </button>
                
                {/* Region count indicator */}
                {regions.length > 0 && !showRegionMapper && (
                  <div className="absolute top-4 right-4 bg-blue-500 text-white text-sm px-2 py-1 rounded-full">
                    {regions.length} {regions.length === 1 ? t('regions.regionSingular') || 'region' : t('regions.regionPlural') || 'regions'}
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
