"use client";

import React, { useState, useEffect } from 'react';
import { getLocations, getLocationRegions, addInventoryItem, getLocationById, Location, Region } from '@/lib/api';
import { ImageInput } from './image-input';
import LocationCarousel from './location-carousel';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/language';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RegionSelector } from '@/components/region-selector';
import { XIcon } from 'lucide-react';

interface InventoryItemFormProps {
  onSubmit?: (formData: FormData) => Promise<void>;
  initialData?: {
    name: string;
    description?: string;
    quantity: number;
    locationId?: number;
    regionId?: number;
    imagePath?: string | null;
  };
  error?: string | null;
  setError?: (error: string | null) => void;
}

export default function InventoryItemForm({ onSubmit, initialData, error, setError }: InventoryItemFormProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [quantity, setQuantity] = useState(initialData?.quantity || 1);
  const [locationId, setLocationId] = useState<number | undefined>(initialData?.locationId);
  const [regionId, setRegionId] = useState<number | undefined>(initialData?.regionId);
  const [image, setImage] = useState<File | null>(null);
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');

  // Fetch locations
  useEffect(() => {
    if (!initialData?.locationId) {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const data = await getLocations();
        setLocations(data);
      } catch (err) {
        console.error('Error fetching locations:', err);
          setError?.(t('common.error') + ': ' + t('locations.title'));
      } finally {
        setLoading(false);
      }
    };
    fetchLocations();
    } else {
      const fetchInitialLocationDetails = async () => {
        if (initialData?.locationId) {
          try {
            setLoading(true);
            const locData = await getLocationById(initialData.locationId);
            setLocations([locData]);
          } catch (locErr) {
            console.error('Error fetching initial location details:', locErr);
            setError?.(t('common.error') + ': ' + t('locations.title'));
          } finally {
            setLoading(false);
          }
        }
      };
      fetchInitialLocationDetails();
    }
  }, [initialData?.locationId, t, setError]);

  // Fetch regions when location changes
  useEffect(() => {
    const fetchRegions = async () => {
      if (!locationId) {
        setRegions([]);
        setRegionId(undefined);
        return;
      }
      
      try {
        setLoading(true);
        const data = await getLocationRegions(locationId);
        setRegions(data);
        
        // Clear region selection if the previously selected region is not in the new list
        if (regionId && !data.some(region => region.id === regionId)) {
          setRegionId(undefined);
        }
      } catch (err) {
        console.error('Error fetching regions:', err);
        setError?.(t('common.error') + ': ' + t('regions.title'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchRegions();
  }, [locationId, regionId, t, setError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError?.(null);
    
    if (!name.trim()) {
      setError?.(t('common.fields.name') + ' ' + t('common.required'));
      return;
    }
    
    try {
      setSubmitting(true);
      
      const formData = new FormData();
      formData.append('name', name);
      
      if (description) {
        formData.append('description', description);
      }
      
      formData.append('quantity', quantity.toString());
      
      if (locationId !== undefined) {
        formData.append('locationId', locationId.toString());
      }
      
      if (regionId !== undefined) {
        formData.append('regionId', regionId.toString());
      }
      
      if (image) {
        formData.append('image', image);
      }
      
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        // If no onSubmit provided, call the API directly
        try {
          const response = await addInventoryItem(formData);
          console.log('Item added successfully:', response);
          router.push('/inventory');
        } catch (apiError: any) {
          console.error('API Error:', apiError);
          setError?.(`${t('common.error')}: ${apiError.message || t('common.error')}`);
          return;
        }
      }
      
      // Reset form after successful submission
      setName('');
      setDescription('');
      setQuantity(1);
      setLocationId(undefined);
      setRegionId(undefined);
      setImage(null);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError?.(`${t('common.error')}: ${err instanceof Error ? err.message : t('common.error')}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLocationSelect = (id: number | null) => {
    setLocationId(id ?? undefined); // If id is null, setLocationId to undefined
    // Reset region when location changes or is deselected
    setRegionId(undefined);
  };

  // Get details of the currently selected location (for image/regions)
  const selectedLocationDetails = locations.find(loc => loc.id === locationId);

  // Filter locations based on search
  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
    (loc.description && loc.description.toLowerCase().includes(locationSearch.toLowerCase()))
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}
      
      <div className="space-y-2">
        <Label htmlFor="name" className="block text-sm font-medium mb-1">
          {t('common.fields.name')} <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description" className="block text-sm font-medium mb-1">
          {t('common.fields.description')} ({t('common.optional')})
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full"
          rows={3}
        />
      </div>
      
      <div className="space-y-2">
        <Label className="block text-sm font-medium mb-1">
          {t('common.fields.image')} ({t('common.optional')})
        </Label>
        <ImageInput onImageChange={(file) => setImage(file)} showUploadSuccessMessage={false} initialImageUrl={initialData?.imagePath} />
      </div>
      
      {/* === Location Selection Section (Conditional) === */}
      {!locationId && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location-search" className="block text-sm font-medium">
              {t('inventory.searchLocation') || 'Search Location'}
            </Label>
            <Input
              id="location-search"
              placeholder={t('common.searchPlaceholder') || 'Search by name or description...'}
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              className="w-full"
            />
        </div>
        
          <div className="space-y-2">
            <Label className="block text-sm font-medium">
              {t('inventory.selectLocation') || 'Select Location'} ({t('common.optional')})
            </Label>
            {loading && <div className="p-4 text-center">{t('common.loading') || 'Loading locations...'}</div>}
            {!loading && error && <div className="p-4 text-red-500 text-center">{error}</div>}
            {!loading && !error && filteredLocations.length === 0 && (
              <div className="p-4 text-center text-muted-foreground">
                {locationSearch
                  ? t('locations.searchNotFound') || 'No locations match your search.'
                  : t('locations.noneFound') || 'No locations found. Please add one first.'}
              </div>
            )}
            {!loading && !error && filteredLocations.length > 0 && (
          <div className="mb-4">
            <LocationCarousel 
                  locations={filteredLocations}
              onSelectLocation={handleLocationSelect}
              selectedLocationId={locationId}
            />
          </div>
        )}
      </div>
        </div>
      )}

      {/* === Region Selection Section (Conditional) === */}
      {locationId && selectedLocationDetails && (
        <div className="space-y-2 relative border rounded-md p-4 pt-10">
          {/* Deselect Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setLocationId(undefined); setRegionId(undefined); }}
            className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
            aria-label={t('locations.deselect') || 'Deselect Location'}
            type="button"
          >
            <XIcon className="h-5 w-5" />
          </Button>

          <Label htmlFor="region" className="block text-sm font-medium mb-1">
            {regions.length > 0 ? t('inventory.selectRegion') : `${t('inventory.region')} (${t('regions.noRegions')})`}
            <span className="text-muted-foreground"> ({selectedLocationDetails.name})</span>
          </Label>
          {selectedLocationDetails.imagePath && regions.length > 0 ? (
            <div className="overflow-hidden">
              <RegionSelector
                key={selectedLocationDetails.id}
                imageSrc={`/api/images/${selectedLocationDetails.imagePath}`}
                regions={regions}
                selectedRegionId={regionId?.toString() ?? null}
                onSelectRegion={(id: string | null) => setRegionId(id ? parseInt(id) : undefined)}
              />
            </div>
          ) : (
            <div className="p-4 border rounded text-center text-muted-foreground">
              {selectedLocationDetails.imagePath ? t('regions.noRegions') : t('locations.noImage')}
            </div>
          )}
        </div>
      )}
      
      <div className="pt-4">
        <Button type="submit" disabled={submitting || loading}>
          {submitting ? t('common.loading') : (initialData ? t('common.update') : t('common.save'))}
        </Button>
      </div>
    </form>
  );
}
