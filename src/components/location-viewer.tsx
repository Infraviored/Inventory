"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RegionDisplay } from './region-mapper/RegionDisplay'; // Assuming RegionDisplay is in this path

// Types (simplified from RegionMapper for display-only purposes)
interface Region {
    id: string | number; // Can be string or number
    name: string;
    x: number;        // Natural coordinates
    y: number;
    width: number;
    height: number;
}

interface DisplayRegion extends Region {
    displayX: number;
    displayY: number;
    displayWidth: number;
    displayHeight: number;
}

interface LocationViewerProps {
    imageSrc: string | null;
    regions: Region[];
    highlightedRegionId?: string | number | null;
    className?: string;
    imageClassName?: string;
    regionBorderWidth?: number;
    defaultRegionBorderColor?: string;
    selectedRegionBorderColor?: string; // For highlighted region
}

// Simplified hook for coordinate conversion (adapted from RegionMapper)
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

        const scaleX = renderedWidth > 0 ? imageSize.width / renderedWidth : 1;
        const scaleY = renderedHeight > 0 ? imageSize.height / renderedHeight : 1;

        return { scaleX, scaleY, offsetX, offsetY, renderedWidth, renderedHeight };
    }, [containerRef, imageSize.width, imageSize.height]);

    const naturalToDisplayRect = useCallback((coords: { x: number; y: number; width: number; height: number; }): Pick<DisplayRegion, 'displayX' | 'displayY' | 'displayWidth' | 'displayHeight'> => {
        const { scaleX, scaleY, offsetX, offsetY } = getScaleOffset();
        const displayScaleX = scaleX !== 0 ? 1 / scaleX : 1;
        const displayScaleY = scaleY !== 0 ? 1 / scaleY : 1;

        const displayX = (coords.x * displayScaleX) + offsetX;
        const displayY = (coords.y * displayScaleY) + offsetY;
        const displayWidth = coords.width * displayScaleX;
        const displayHeight = coords.height * displayScaleY;
        return { displayX, displayY, displayWidth, displayHeight };
    }, [getScaleOffset]);

    return { getScaleOffset, naturalToDisplayRect };
}


export const LocationViewer: React.FC<LocationViewerProps> = ({
    imageSrc,
    regions,
    highlightedRegionId,
    className = '',
    imageClassName = '',
    regionBorderWidth = 2,
    defaultRegionBorderColor = '#4ade80', // green-400
    selectedRegionBorderColor = '#facc15', // yellow-400
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [error, setError] = useState<string | null>(null);

    const { naturalToDisplayRect, getScaleOffset } = useImageDisplayCoordinates(containerRef, imageSize);

    useEffect(() => {
        if (imageSrc && imageRef.current) {
            const img = imageRef.current;
            const handleLoad = () => {
                setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
                setError(null);
            };
            const handleError = () => {
                setError("Failed to load image.");
                setImageSize({ width: 0, height: 0 });
            };

            img.onload = handleLoad;
            img.onerror = handleError;
            
            // If image is already loaded (e.g. cached)
            if (img.complete && img.naturalWidth > 0) {
                handleLoad();
            } else if (img.complete && img.naturalWidth === 0) {
                // This can happen if src is set but image is broken or not found
                handleError();
            }
        } else if (!imageSrc) {
             setImageSize({ width: 0, height: 0 }); // Reset if no imageSrc
             setError(null);
        }
    }, [imageSrc]);

    const displayRegions = useMemo((): DisplayRegion[] => {
        if (!imageSize.width || !imageSize.height) return [];
        return regions.map(region => ({
            ...region,
            ...naturalToDisplayRect(region),
        }));
    }, [regions, imageSize, naturalToDisplayRect]);
    
    // Effect to re-calculate display regions if container size changes
    useEffect(() => {
        const observer = new ResizeObserver(() => {
            // This will trigger recalculation of scale/offset and thus displayRegions via useMemo dependencies
            if (imageRef.current && imageRef.current.complete && imageRef.current.naturalWidth > 0) {
                 setImageSize({ width: imageRef.current.naturalWidth, height: imageRef.current.naturalHeight });
            }
        });
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => observer.disconnect();
    }, [naturalToDisplayRect]);


    if (!imageSrc) {
        return (
            <div className={`flex items-center justify-center bg-muted/50 text-muted-foreground p-4 ${className}`} style={{aspectRatio: '16/9'}}>
                No image provided.
            </div>
        );
    }
    
    if (error) {
        return (
             <div className={`flex items-center justify-center bg-destructive/10 text-destructive p-4 ${className}`} style={{aspectRatio: '16/9'}}>
                {error}
            </div>
        );
    }
    
    const { renderedWidth, renderedHeight, offsetX, offsetY } = getScaleOffset();

    return (
        <div 
            ref={containerRef} 
            className={`relative w-full h-auto overflow-hidden bg-muted/30 dark:bg-muted/10 ${className}`}
            style={{ aspectRatio: imageSize.width && imageSize.height ? `${imageSize.width}/${imageSize.height}` : '16/9' }}
        >
            <img
                ref={imageRef}
                src={imageSrc}
                alt="Location"
                className={`block ${imageClassName}`}
                style={{
                    width: `${renderedWidth}px`,
                    height: `${renderedHeight}px`,
                    position: 'absolute',
                    left: `${offsetX}px`,
                    top: `${offsetY}px`,
                    objectFit: 'contain', // Use contain to ensure full image is visible
                }}
                // Optimization: prevent re-render if src is the same. React handles this for src.
                // Adding hidden class until loaded to prevent broken image icon flash could be done with state.
            />
            {displayRegions.map(region => (
                <RegionDisplay
                    key={region.id}
                    displayX={region.displayX}
                    displayY={region.displayY}
                    displayWidth={region.displayWidth}
                    displayHeight={region.displayHeight}
                    name={region.name}
                    isSelected={region.id === highlightedRegionId}
                    isResizing={false} // Not applicable in viewer
                    onDuplicate={() => {}} // No-op
                    onRemove={() => {}}   // No-op
                    defaultBorderColor={defaultRegionBorderColor}
                    selectedBorderColor={selectedRegionBorderColor}
                    borderWidth={regionBorderWidth}
                    isSelectMode={true} // Ensures no editing controls
                />
            ))}
        </div>
    );
}; 