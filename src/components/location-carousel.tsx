"use client";

import { useEffect, useRef } from 'react';
import { Location } from '@/lib/api';
import Image from 'next/image'; // Using next/image for potential optimization
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"; // Assuming this is the path to your Shadcn UI carousel
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/language';
import Autoplay from "embla-carousel-autoplay"; // Import Autoplay

interface LocationCarouselProps {
  locations: Location[];
  onSelectLocation: (locationId: number | null) => void;
  selectedLocationId?: number | null;
  itemsToShow?: number; // How many items to show at once
  autoplayDelay?: number; // Optional autoplay delay in ms
}

export default function LocationCarousel({
  locations,
  onSelectLocation,
  selectedLocationId,
  itemsToShow = 3, // Default to showing 3 items
  autoplayDelay = 5000, // Default to 5 seconds
}: LocationCarouselProps) {
  const { t } = useLanguage();
  const autoplayPlugin = useRef(Autoplay({ delay: autoplayDelay, stopOnInteraction: true, stopOnMouseEnter: true }));

  if (!locations || locations.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">{t('locations.noneFound') || 'No locations found.'}</div>;
  }

  // Determine basis for CarouselItem based on itemsToShow
  let basisClass = 'basis-full'; // Default for 1 item
  if (itemsToShow === 2) basisClass = 'md:basis-1/2';
  else if (itemsToShow === 3) basisClass = 'md:basis-1/3';
  else if (itemsToShow === 4) basisClass = 'md:basis-1/4';
  else if (itemsToShow >= 5) basisClass = 'md:basis-1/5';


  return (
    <Carousel
      opts={{
        align: "start",
        loop: locations.length > itemsToShow, // Loop if more items than shown
      }}
      plugins={[autoplayPlugin.current]} // Add autoplay plugin
      onMouseEnter={() => autoplayPlugin.current.stop()} // Corrected: Wrap in arrow function
      onMouseLeave={() => autoplayPlugin.current.play()} // Corrected: Wrap in arrow function
      className="w-full max-w-xs sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto" // Responsive max width
    >
      <CarouselContent className="-ml-1 py-1">
        {locations.map((location) => (
          <CarouselItem key={location.id} className={cn("pl-1", basisClass, "group")}>
            <div className="p-1">
              <Card
                className={cn(
                  "overflow-hidden transition-all cursor-pointer",
                  selectedLocationId === location.id
                    ? "ring-2 ring-primary ring-offset-2"
                    : "hover:shadow-md"
                )}
                onClick={() => onSelectLocation(selectedLocationId === location.id ? null : location.id)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        onSelectLocation(selectedLocationId === location.id ? null : location.id);
                    }
                }}
                tabIndex={0}
                role="button"
                aria-pressed={selectedLocationId === location.id}
                aria-label={`${t('locations.selectLocation') || 'Select location'}: ${location.name}`}
              >
                <CardContent className="flex aspect-square items-center justify-center p-0 relative">
                  {location.imagePath ? (
                    <Image
                      src={`/api/images/${location.imagePath}`}
                      alt={location.name}
                      width={300} // Provide explicit width
                      height={300} // Provide explicit height
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground text-sm">{t('common.noImage') || 'No Image'}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white">
                    <h3 className="text-sm font-semibold truncate" title={location.name}>{location.name}</h3>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      {locations.length > itemsToShow && ( // Only show arrows if there are more items than can be shown
        <>
            <CarouselPrevious className="absolute left-[-10px] sm:left-[-15px] top-1/2 -translate-y-1/2 z-10 hidden md:inline-flex" />
            <CarouselNext className="absolute right-[-10px] sm:right-[-15px] top-1/2 -translate-y-1/2 z-10 hidden md:inline-flex" />
        </>
      )}
    </Carousel>
  );
}
