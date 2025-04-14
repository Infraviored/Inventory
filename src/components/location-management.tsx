"use client";

import { useState, useEffect } from 'react';
import { getLocations, addLocation, deleteLocation, Location } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LocationForm } from './location-form';

export default function LocationManagement({ parentId }: { parentId?: number }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const router = useRouter();

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // If parentId is provided, fetch child locations, otherwise fetch root locations
        const data = await getLocations(parentId, parentId === undefined);
        setLocations(data);
      } catch (err) {
        console.error('Error fetching locations:', err);
        setError('Failed to fetch locations');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLocations();
  }, [parentId]);

  // Handle location deletion
  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this location? This will also delete all child locations and items stored here.')) {
      try {
        await deleteLocation(id);
        // Refresh the locations list
        const updatedLocations = locations.filter(loc => loc.id !== id);
        setLocations(updatedLocations);
      } catch (err) {
        console.error('Error deleting location:', err);
        setError('Failed to delete location');
      }
    }
  };

  // Handle form submission
  const handleFormSubmit = async (formData: FormData) => {
    try {
      // Add parent ID to form data if provided
      if (parentId !== undefined) {
        formData.append('parentId', parentId.toString());
      }
      
      const newLocation = await addLocation(formData);
      setLocations([...locations, newLocation]);
      setShowAddForm(false);
    } catch (err) {
      console.error('Error creating location:', err);
      setError('Failed to create location');
    }
  };

  if (loading) {
    return <div className="p-4">Loading locations...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          {parentId ? 'Sublocation Management' : 'Location Management'}
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          {showAddForm ? 'Cancel' : 'Add New Location'}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 border rounded shadow">
          <h3 className="text-xl font-semibold mb-4">Add New Location</h3>
          <LocationForm parentId={parentId} onSuccess={() => {
            setShowAddForm(false);
            const fetchLocations = async () => {
              try {
                setLoading(true);
                setError(null);
                
                // If parentId is provided, fetch child locations, otherwise fetch root locations
                const data = await getLocations(parentId, parentId === undefined);
                setLocations(data);
              } catch (err) {
                console.error('Error fetching locations:', err);
                setError('Failed to fetch locations');
              } finally {
                setLoading(false);
              }
            };
            
            fetchLocations();
          }} />
        </div>
      )}

      {locations.length === 0 ? (
        <div className="text-center p-8 bg-gray-100 rounded">
          <p>No locations found. Add a new location to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((location) => (
            <div
              key={location.id}
              className="border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="relative h-48 bg-gray-200">
                {location.imagePath ? (
                  <img
                    src={location.imagePath}
                    alt={location.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-gray-400">No image</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">{location.name}</h3>
                {location.description && (
                  <p className="text-gray-600 mb-4">{location.description}</p>
                )}
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={() => {
                      setShowAddForm(true);
                      // Here we would typically load the location data for editing
                      // For now, we'll just show the form which will allow creating a new location
                      // In a full implementation, we would pre-populate the form with location data
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(location.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
