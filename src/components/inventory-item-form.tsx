import { useState, useEffect } from 'react';
import { getLocations, getLocationRegions, Location, Region } from '@/lib/api';
import ImageInput from './image-input';

interface InventoryItemFormProps {
  onSubmit: (formData: FormData) => Promise<void>;
  initialData?: {
    name: string;
    description?: string;
    quantity: number;
    locationId?: number;
    regionId?: number;
  };
}

export default function InventoryItemForm({ onSubmit, initialData }: InventoryItemFormProps) {
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

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const data = await getLocations();
        setLocations(data);
      } catch (err) {
        console.error('Error fetching locations:', err);
        setError('Failed to fetch locations');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLocations();
  }, []);

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
        setError('Failed to fetch regions');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRegions();
  }, [locationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('Please enter an item name');
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
      
      await onSubmit(formData);
      
      // Reset form after successful submission
      setName('');
      setDescription('');
      setQuantity(1);
      setLocationId(undefined);
      setRegionId(undefined);
      setImage(null);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}
      
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Name <span className="text-red-500">*</span>
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
          Description (Optional)
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
          Quantity
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
        <label htmlFor="location" className="block text-sm font-medium mb-1">
          Location (Optional)
        </label>
        <select
          id="location"
          value={locationId || ''}
          onChange={(e) => setLocationId(e.target.value ? parseInt(e.target.value) : undefined)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="">-- Select Location --</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>
      
      {locationId && (
        <div>
          <label htmlFor="region" className="block text-sm font-medium mb-1">
            Region (Optional)
          </label>
          <select
            id="region"
            value={regionId || ''}
            onChange={(e) => setRegionId(e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full border rounded px-3 py-2"
            disabled={regions.length === 0}
          >
            <option value="">-- Select Region --</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
          {regions.length === 0 && locationId && (
            <p className="text-sm text-gray-500 mt-1">
              No regions defined for this location. Add regions first.
            </p>
          )}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium mb-1">
          Image (Optional)
        </label>
        <ImageInput onImageSelected={setImage} />
      </div>
      
      <div className="pt-4">
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          disabled={submitting}
        >
          {submitting ? 'Saving...' : 'Save Item'}
        </button>
      </div>
    </form>
  );
}
