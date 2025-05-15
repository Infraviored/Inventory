"use client";

import { useState, useEffect } from 'react';
import { getLocations, Location } from '@/lib/api';
import Image from 'next/image';

interface LocationCarouselProps {
  locations: Location[];
  onSelectLocation: (locationId: number) => void;
  selectedLocationId?: number;
}

export default function LocationCarousel({ locations, onSelectLocation, selectedLocationId }: LocationCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (selectedLocationId && locations.length > 0) {
      const index = locations.findIndex(loc => loc.id === selectedLocationId);
      setCurrentIndex(index !== -1 ? index : 0);
    } else if (locations.length > 0) {
      setCurrentIndex(0);
    } else {
      setCurrentIndex(0);
      }
  }, [locations, selectedLocationId]);

  const goToPrevious = () => {
      const newIndex = currentIndex === 0 ? locations.length - 1 : currentIndex - 1;
    if (locations.length > 0 && locations[newIndex]) {
      setCurrentIndex(newIndex);
      onSelectLocation(locations[newIndex].id);
    } else if (locations.length > 0) {
      setCurrentIndex(0);
      onSelectLocation(locations[0].id);
    }
  };

  const goToNext = () => {
    const newIndex = currentIndex >= locations.length - 1 ? 0 : currentIndex + 1;
    if (locations.length > 0 && locations[newIndex]) {
      setCurrentIndex(newIndex);
      onSelectLocation(locations[newIndex].id);
    } else if (locations.length > 0) {
      setCurrentIndex(0);
      onSelectLocation(locations[0].id);
    }
  };

  const handleSelect = (index: number) => {
    if (index >= 0 && index < locations.length) {
    setCurrentIndex(index);
      if (locations[index].id !== selectedLocationId) {
    onSelectLocation(locations[index].id);
      }
    }
  };

  if (locations.length === 0) {
    return null;
  }

  const safeCurrentIndex = Math.min(Math.max(0, currentIndex), locations.length - 1);
  if (locations.length === 0 || !locations[safeCurrentIndex]) {
    return <div className="p-4 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="relative w-full">
      <div className="overflow-hidden rounded-lg border shadow-md">
        <div className="relative h-64 bg-gray-200 cursor-pointer" onClick={() => handleSelect(safeCurrentIndex)} role="button" tabIndex={0} aria-label={`Select location ${locations[safeCurrentIndex].name}`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(safeCurrentIndex); }}>
          {locations[safeCurrentIndex].imagePath ? (
            <img
              src={locations[safeCurrentIndex].imagePath}
              alt={locations[safeCurrentIndex].name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-400">No image</span>
            </div>
          )}
          
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
            <h3 className="text-lg font-semibold">{locations[safeCurrentIndex].name}</h3>
            {locations[safeCurrentIndex].description && (
              <p className="text-sm">{locations[safeCurrentIndex].description}</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex justify-between mt-2">
        <button
          onClick={goToPrevious}
          className="bg-gray-200 hover:bg-gray-300 rounded-full p-2"
          aria-label="Previous location"
          type="button"
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
              type="button"
            />
          ))}
        </div>
        
        <button
          onClick={goToNext}
          className="bg-gray-200 hover:bg-gray-300 rounded-full p-2"
          aria-label="Next location"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
