"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Region } from '@/lib/api'; // Assuming Region type is here
import { RegionDisplay } from './region-mapper/RegionDisplay'; // Reuse display
import { RegionList } from './region-mapper/RegionList'; // Reuse list
import { useLanguage } from '@/lib/language';

// Interface for the display-ready region data
interface DisplayRegion extends Omit<Region, 'id'> { // Omit the original number ID
    id: string; // Define ID as string here
    displayX: number;
    displayY: number;
    displayWidth: number;
    displayHeight: number;
}

// Props for the new component
interface RegionSelectorProps {
    imageSrc: string;
    regions: Region[]; // Input regions (natural coords)
    selectedRegionId: string | null; // ID of the currently selected region
    onSelectRegion: (id: string | null) => void; // Callback when a region is selected
    // Optional: Pass style props if needed, or define defaults here
    defaultBorderColor?: string;
    selectedBorderColor?: string;
    borderWidth?: number;
}

// --- Coordinate Hook (Copied and adapted from RegionMapper) ---
// NOTE: Assumes Region type has x,y,width,height. Adapt if needed.
function useImageDisplayCoordinates(
    containerRef: React.RefObject<HTMLDivElement>,
    imageSize: { width: number; height: number }
) {
    const getScaleOffset = useCallback(() => {
        if (!containerRef.current || !imageSize.width || !imageSize.height) {
            return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, renderedWidth: 0, renderedHeight: 0 };
        }
        const rect = containerRef.current.getBoundingClientRect();
        const containerAspect = rect.width / rect.height;
        const imageAspect = imageSize.width / imageSize.height;
        let renderedWidth, renderedHeight, offsetX, offsetY;

        if (imageAspect > containerAspect) {
            renderedWidth = rect.width;
            renderedHeight = rect.width / imageAspect;
            offsetX = 0;
            offsetY = (rect.height - renderedHeight) / 2;
        } else {
            renderedHeight = rect.height;
            renderedWidth = rect.height * imageAspect;
            offsetY = 0;
            offsetX = (rect.width - renderedWidth) / 2;
        }
        // Renamed scale factors for clarity: natural -> display
        const scaleXNaturalToDisplay = renderedWidth > 0 ? renderedWidth / imageSize.width : 1; 
        const scaleYNaturalToDisplay = renderedHeight > 0 ? renderedHeight / imageSize.height : 1;

        return { scaleX: scaleXNaturalToDisplay, scaleY: scaleYNaturalToDisplay, offsetX, offsetY, renderedWidth, renderedHeight };

    }, [containerRef, imageSize.width, imageSize.height]);

    // Convert natural image rect {x,y,w,h} to display rect {x,y,w,h}
    const naturalToDisplayRect = useCallback((region: Region): Pick<DisplayRegion, 'displayX' | 'displayY' | 'displayWidth' | 'displayHeight'> => {
        const { scaleX, scaleY, offsetX, offsetY } = getScaleOffset();
        const displayX = (region.x * scaleX) + offsetX;
        const displayY = (region.y * scaleY) + offsetY;
        const displayWidth = region.width * scaleX;
        const displayHeight = region.height * scaleY;
        return { displayX, displayY, displayWidth, displayHeight };
    }, [getScaleOffset]);

    return { getScaleOffset, naturalToDisplayRect };
}
// --- End Coordinate Hook ---

export function RegionSelector({
    imageSrc,
    regions,
    selectedRegionId,
    onSelectRegion,
    defaultBorderColor = '#d1d5db', // Default gray-300
    selectedBorderColor = '#3b82f6', // Default blue-500 for selection
    borderWidth = 2, // Default 2px for selector
}: RegionSelectorProps) {
    const { t } = useLanguage();
    const containerRef = useRef<HTMLDivElement>(null);
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [error, setError] = useState<string | null>(null);
    const [displayRegions, setDisplayRegions] = useState<DisplayRegion[]>([]);

    const { getScaleOffset, naturalToDisplayRect } = useImageDisplayCoordinates(containerRef, imageSize);

    // Effect to load image dimensions
    useEffect(() => {
        setImageSize({ width: 0, height: 0 });
        setError(null);
        if (!imageSrc) return;
        let isCancelled = false;
        const img = new Image();
        img.onload = () => {
            if (!isCancelled && img.naturalWidth > 0 && img.naturalHeight > 0) {
                setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
            } else if (!isCancelled) {
                setError('Image loaded but dimensions invalid');
            }
        };
        img.onerror = () => !isCancelled && setError('Failed to load image');
        img.src = imageSrc;
        return () => { isCancelled = true; };
    }, [imageSrc]);

    // Effect to calculate display regions when image/regions change
    useEffect(() => {
        if (!imageSize.width || !imageSize.height) {
            setDisplayRegions([]);
            return;
        }
        const nextDisplayRegions = regions.map((r, index) => ({
            ...r,
            // Ensure a stable string ID by converting number ID
            id: String(r.id ?? `region-sel-${index}`), // Convert number ID to string
            ...naturalToDisplayRect(r),
        }));
        setDisplayRegions(nextDisplayRegions);
    }, [regions, imageSize, naturalToDisplayRect]);

    // Handle click on region overlay
    const handleRegionClick = (regionId: string) => {
        onSelectRegion(regionId === selectedRegionId ? null : regionId); // Toggle selection
    };

    const { renderedWidth, renderedHeight, offsetX, offsetY } = getScaleOffset();

    return (
        <div className="flex flex-col gap-4 w-full">
            {/* Image Container */}
            <div 
                ref={containerRef}
                className="relative overflow-hidden border border-border w-full bg-muted/20 dark:bg-muted/10"
                style={{ 
                    minHeight: 150, // Smaller min height for selector?
                    aspectRatio: imageSize.width && imageSize.height ? `${imageSize.width} / ${imageSize.height}` : '16 / 9',
                }}
            >
                {error && (
                     <div className="absolute inset-0 flex items-center justify-center text-destructive">
                        {error}
                    </div>
                )}
                {!error && imageSize.width > 0 && renderedWidth > 0 && renderedHeight > 0 && (
                    <>
                        <img
                            key={imageSrc} 
                            src={imageSrc} 
                            alt={t('regions.locationImage') || "Location image"}
                            className="select-none pointer-events-none" // Removed: block, object-contain, max-w-full, max-h-full
                            style={{
                                position: 'absolute',
                                left: `${offsetX}px`,
                                top: `${offsetY}px`,
                                width: `${renderedWidth}px`,
                                height: `${renderedHeight}px`,
                                objectFit: 'contain', // Keep contain for the image content
                            }}
                            draggable={false}
                        />
                        {/* Render regions */}
                        {displayRegions.map((region) => (
                            <div 
                                key={region.id}
                                className="absolute cursor-pointer group" // Make overlay clickable
                                style={{
                                    left: `${region.displayX}px`,
                                    top: `${region.displayY}px`,
                                    width: `${region.displayWidth}px`,
                                    height: `${region.displayHeight}px`,
                                    zIndex: region.id === selectedRegionId ? 15 : 10,
                                }}
                                onClick={() => handleRegionClick(region.id)}
                            >
                                <RegionDisplay
                                    displayX={0} // Position relative to parent div
                                    displayY={0}
                                    displayWidth={region.displayWidth}
                                    displayHeight={region.displayHeight}
                                    name={region.name}
                                    isSelected={region.id === selectedRegionId}
                                    isResizing={false} // Never resizing in selector
                                    onDuplicate={() => {}} // No op
                                    onRemove={() => {}} // No op
                                    defaultBorderColor={defaultBorderColor}
                                    selectedBorderColor={selectedBorderColor}
                                    borderWidth={borderWidth}
                                    className={`group-hover:border-ring ${region.id === selectedRegionId ? 'border-ring' : ''}`}
                                    isSelectMode={true}
                                />
                            </div>
                        ))}
                    </>
                )}
                {!error && !imageSize.width && !(renderedWidth > 0 && renderedHeight > 0) && ( // Adjusted condition for loading/no image
                     <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        {imageSrc ? 'Loading image...' : 'No image'}
                    </div>
                )}
            </div>

            {/* Region List for Selection */}
            {displayRegions.length > 0 && (
                <RegionList
                    regions={displayRegions as any} // Cast needed as ActiveRegion includes interactive state
                    selectedRegionId={selectedRegionId}
                    onSelectRegion={handleRegionClick} // Use same handler
                    onRemoveRegion={() => {}} // No remove action
                    onEditRegion={() => {}} // No edit action
                    // Pass selection mode flag if needed by list for styling/buttons
                    isSelectMode={true} 
                />
            )}
        </div>
    );
} 