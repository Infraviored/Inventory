"use client";

import { useState, useEffect } from 'react';
import { getLocations, getLocationRegions, addInventoryItem, Location, Region } from '@/lib/api';
import { ImageInput } from './image-input';
import LocationCarousel from './location-carousel';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/language';

interface InventoryItemFormProps {
  onSubmit?: (formData: FormData) => Promise<void>;
  initialData?: {
    name: string;
    description?: string;
    quantity: number;
    locationId?: number;
    regionId?: number;
  };
}

export default function InventoryItemForm({ onSubmit, initialData }: InventoryItemFormProps) {
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
  const [error, setError] = useState<string | null>(null);
  const [useCarouselView, setUseCarouselView] = useState(false);

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const data = await getLocations();
        setLocations(data);
      } catch (err) {
        console.error('Error fetching locations:', err);
        setError(t('common.error') + ': ' + t('locations.title'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchLocations();
  }, [t]);

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
        setError(t('common.error') + ': ' + t('regions.title'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchRegions();
  }, [locationId, regionId, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert(t('common.fields.name') + ' ' + t('common.required'));
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
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
          setError(`${t('common.error')}: ${apiError.message || t('common.error')}`);
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
      setError(`${t('common.error')}: ${err instanceof Error ? err.message : t('common.error')}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLocationSelect = (id: number) => {
    setLocationId(id);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}
      
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          {t('common.fields.name')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          {t('common.fields.description')} ({t('common.optional')})
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded px-3 py-2"
          rows={3}
        />
      </div>
      
      <div>
        <label htmlFor="quantity" className="block text-sm font-medium mb-1">
          {t('inventory.quantity')}
        </label>
        <input
          type="number"
          id="quantity"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          min="1"
          className="w-full border rounded px-3 py-2"
        />
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="location" className="block text-sm font-medium">
            {t('inventory.location')} ({t('common.optional')})
          </label>
          <button
            type="button"
            onClick={() => setUseCarouselView(!useCarouselView)}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            {useCarouselView ? t('inventory.switchToDropdown') : t('inventory.switchToCarousel')}
          </button>
        </div>
        
        {useCarouselView ? (
          <div className="mb-4">
            <LocationCarousel 
              onSelectLocation={handleLocationSelect}
              selectedLocationId={locationId}
            />
          </div>
        ) : (
          <select
            id="location"
            value={locationId || ''}
            onChange={(e) => setLocationId(e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">{t('inventory.selectLocation')}</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        )}
      </div>
      
      {locationId && (
        <div>
          <label htmlFor="region" className="block text-sm font-medium mb-1">
            {t('inventory.region')} ({t('common.optional')})
          </label>
          {regions.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {regions.map((region) => (
                <div 
                  key={region.id}
                  onClick={() => setRegionId(region.id)}
                  className={`border rounded p-2 cursor-pointer ${
                    regionId === region.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                >
                  <div className="text-sm font-medium">{region.name}</div>
                  <div 
                    className="mt-1 w-full h-4 rounded"
                    style={{ 
                      backgroundColor: region.color ? `#${region.color}` : '#3b82f6',
                      opacity: 0.7
                    }}
                  ></div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <select
                id="region"
                value={regionId || ''}
                onChange={(e) => setRegionId(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full border rounded px-3 py-2"
                disabled={regions.length === 0}
              >
                <option value="">{t('inventory.selectRegion')}</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
              {regions.length === 0 && locationId && (
                <p className="text-sm text-gray-500 mt-1">
                  {t('inventory.noRegionsDefined')}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium mb-1">
          {t('common.fields.image')} ({t('common.optional')})
        </label>
        <ImageInput onImageChange={(file) => setImage(file)} />
      </div>
      
      <div className="pt-4">
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          disabled={submitting}
        >
          {submitting ? `${t('common.loading')}...` : t('common.save')}
        </button>
      </div>
    </form>
  );
}
