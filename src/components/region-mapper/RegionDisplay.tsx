"use client";

import React from 'react';
import { ActiveRegion } from './types';
import { useLanguage } from '@/lib/language';

interface RegionDisplayProps {
  region: ActiveRegion;
  isSelected: boolean;
  onToggleResize: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export function RegionDisplay({ region, isSelected, onToggleResize, onDuplicate, onRemove }: RegionDisplayProps) {
  const { t } = useLanguage();
  
  // Selected regions use yellow, unselected use the primary color
  const borderColor = isSelected ? 'border-yellow-500 dark:border-yellow-400' : 'border-primary dark:border-primary';
  const bgColor = isSelected ? 'bg-yellow-500/30 dark:bg-yellow-400/20' : 'bg-primary/30 dark:bg-primary/20';
  const labelBg = isSelected ? 'bg-yellow-500 dark:bg-yellow-400' : 'bg-primary dark:bg-primary';

  return (
    <div 
      key={region.id}
      className={`absolute border-2 ${borderColor} ${bgColor} z-10`}
      style={{
        left: `${region.x}px`,
        top: `${region.y}px`,
        width: `${region.width}px`,
        height: `${region.height}px`,
        pointerEvents: 'all'
      }}
    >
      {/* Region name label */}
      <div className={`absolute top-0 left-0 px-1 py-0.5 text-xs ${labelBg} text-primary-foreground`}>
        {region.name || t('regions.unnamed') || 'Unnamed'}
      </div>
      
      {/* Region dimensions label */}
      <div className="absolute bottom-0 right-0 px-1 py-0.5 text-xs bg-background/80 dark:bg-background/90 text-foreground">
        {Math.round(region.width)}×{Math.round(region.height)}
      </div>
      
      {/* Control buttons (top right) */}
      {isSelected && (
        <div className="absolute top-0 right-0 flex">
          {/* Duplicate button */}
          {onDuplicate && (
            <div 
              className="w-6 h-6 mr-1 bg-yellow-500 dark:bg-yellow-400 border border-background dark:border-background rounded-sm cursor-pointer flex items-center justify-center"
              title={t('common.copy') || "Duplicate region"}
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(region.id);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="8" y="8" width="12" height="12" rx="2" ry="2"></rect>
                <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path>
              </svg>
            </div>
          )}
          
          {/* Delete button */}
          {onRemove && (
            <div 
              className="w-6 h-6 bg-destructive dark:bg-red-500 border border-background dark:border-background rounded-sm cursor-pointer flex items-center justify-center"
              title={t('common.delete') || "Delete region"}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(region.id);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </div>
          )}
        </div>
      )}
      
      {/* Resize handle (bottom right) */}
      {isSelected && (
        <div 
          className="absolute bottom-0 right-0 w-6 h-6 bg-yellow-500 dark:bg-yellow-400 border border-background dark:border-background rounded-sm cursor-se-resize z-20"
          style={{
            transform: 'translate(30%, 30%)'
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleResize(region.id);
          }}
        />
      )}
    </div>
  );
}
