"use client";

import { useState, useEffect } from 'react';
import { getLocations, Location } from '@/lib/api';
import Image from 'next/image';

interface LocationCarouselProps {
  onSelectLocation: (locationId: number) => void;
  selectedLocationId?: number;
}

export default function LocationCarousel({ onSelectLocation, selectedLocationId }: LocationCarouselProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await getLocations();
        setLocations(data);
        
        // If a location is already selected, find its index
        if (selectedLocationId) {
          const index = data.findIndex(loc => loc.id === selectedLocationId);
          if (index !== -1) {
            setCurrentIndex(index);
          }
        }
      } catch (err) {
        console.error('Error fetching locations:', err);
        setError('Failed to fetch locations');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLocations();
  }, [selectedLocationId]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? locations.length - 1 : prevIndex - 1
    );
    if (locations.length > 0) {
      const newIndex = currentIndex === 0 ? locations.length - 1 : currentIndex - 1;
      onSelectLocation(locations[newIndex].id);
    }
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === locations.length - 1 ? 0 : prevIndex + 1
    );
    if (locations.length > 0) {
      const newIndex = currentIndex === locations.length - 1 ? 0 : currentIndex + 1;
      onSelectLocation(locations[newIndex].id);
    }
  };

  const handleSelect = (index: number) => {
    setCurrentIndex(index);
    onSelectLocation(locations[index].id);
  };

  if (loading) {
    return <div className="p-4">Loading locations...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  if (locations.length === 0) {
    return <div className="p-4">No locations found. Please add locations first.</div>;
  }

  return (
    <div className="relative w-full">
      <div className="overflow-hidden rounded-lg border shadow-md">
        <div className="relative h-64 bg-gray-200">
          {locations[currentIndex].imagePath ? (
            <img
              src={locations[currentIndex].imagePath}
              alt={locations[currentIndex].name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-400">No image</span>
            </div>
          )}
          
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
            <h3 className="text-lg font-semibold">{locations[currentIndex].name}</h3>
            {locations[currentIndex].description && (
              <p className="text-sm">{locations[currentIndex].description}</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex justify-between mt-2">
        <button
          onClick={goToPrevious}
          className="bg-gray-200 hover:bg-gray-300 rounded-full p-2"
          aria-label="Previous location"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex space-x-1 items-center">
          {locations.map((_, index) => (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              className={`h-2 w-2 rounded-full ${
                index === currentIndex ? 'bg-blue-500' : 'bg-gray-300'
              }`}
              aria-label={`Go to location ${index + 1}`}
            />
          ))}
        </div>
        
        <button
          onClick={goToNext}
          className="bg-gray-200 hover:bg-gray-300 rounded-full p-2"
          aria-label="Next location"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
