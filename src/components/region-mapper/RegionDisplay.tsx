"use client";

import React from 'react';
import { ActiveRegion } from './types';
import { useLanguage } from '@/lib/language';

interface RegionDisplayProps {
  region: ActiveRegion;
  isSelected: boolean;
  onToggleResize: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}

export function RegionDisplay({
  region,
  isSelected,
  onToggleResize,
  onDuplicate,
  onRemove
}: RegionDisplayProps) {
  const { t } = useLanguage();
  
  return (
    <div
      className={`absolute ${isSelected ? 'border-2 border-yellow-500 dark:border-yellow-400' : 'border-2 border-primary dark:border-primary'} 
                 ${isSelected ? 'bg-yellow-100/30 dark:bg-yellow-900/20' : 'bg-primary/20 dark:bg-primary/20'}`}
      style={{
        left: `${region.x}px`,
        top: `${region.y}px`,
        width: `${region.width}px`,
        height: `${region.height}px`,
        pointerEvents: 'all',
        zIndex: isSelected ? 20 : 10
      }}
    >
      {/* Region label */}
      <div className={`absolute top-0 left-0 px-1 text-xs font-medium
                     ${isSelected ? 'bg-yellow-500 text-yellow-50 dark:bg-yellow-400 dark:text-yellow-900' 
                                 : 'bg-primary text-primary-foreground dark:bg-primary'}`}>
        {region.name || t('regions.unnamed') || "Unnamed"}
      </div>
      
      {/* Control buttons (top right) */}
      {isSelected && (
        <div className="absolute top-0 right-0 flex">
          {/* Duplicate button */}
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
          
          {/* Delete button */}
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
        </div>
      )}
      
      {/* Resize handle - intentionally larger for better usability */}
      {isSelected && (
        <div
          className="absolute flex items-center justify-center cursor-se-resize"
          style={{
            right: -8,
            bottom: -8,
            width: 24,
            height: 24,
            pointerEvents: 'all',
            zIndex: 30
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-6 h-6 bg-yellow-500 dark:bg-yellow-400 rounded-br-md border-2 border-white dark:border-gray-800 shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white dark:text-gray-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 17 17 17 17 7" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
