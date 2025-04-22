"use client";

import React from 'react';
import { Region } from './types';
import { useLanguage } from '@/lib/language';

interface RegionDisplayProps {
  region: Region;
  isSelected: boolean;
  isResizing: boolean;
  onToggleResize: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  className?: string;
}

export function RegionDisplay({
  region,
  isSelected,
  isResizing,
  onToggleResize,
  onDuplicate,
  onRemove,
  className = ''
}: RegionDisplayProps) {
  const { t } = useLanguage();
  
  const baseClasses = "absolute";
  const borderClasses = isSelected 
      ? 'border-2 border-yellow-500 dark:border-yellow-400' 
      : 'border border-primary dark:border-primary';
  const bgClasses = isSelected 
      ? 'bg-yellow-100/20 dark:bg-yellow-900/10'
      : 'bg-primary/10 dark:bg-primary/10';
  const zIndex = isSelected ? 20 : 10;

  return (
    <div
      className={`${baseClasses} ${borderClasses} ${bgClasses} ${className}`}
      style={{
        left: `${region.x}px`,
        top: `${region.y}px`,
        width: `${region.width}px`,
        height: `${region.height}px`,
        pointerEvents: 'none',
        zIndex: zIndex
      }}
    >
      <div 
        className={`absolute top-0 left-0 px-1 text-xs font-medium pointer-events-auto
                     ${isSelected ? 'bg-yellow-500 text-yellow-50 dark:bg-yellow-400 dark:text-yellow-900' 
                                 : 'bg-primary text-primary-foreground dark:bg-primary'}`}
        title={region.name || t('regions.unnamed') || "Unnamed"}
      >
        <span className="block overflow-hidden text-ellipsis whitespace-nowrap max-w-[100px]">
            {region.name || t('regions.unnamed') || "Unnamed"}
        </span>
      </div>
      
      {isSelected && (
        <div className="absolute top-0 right-0 flex pointer-events-auto">
          <button 
            type="button"
            className="w-6 h-6 mr-1 bg-yellow-500 dark:bg-yellow-400 border border-background dark:border-background rounded-sm cursor-pointer flex items-center justify-center text-yellow-900 dark:text-yellow-900 hover:bg-yellow-400 dark:hover:bg-yellow-300 transition-colors"
            title={t('common.copy') || "Duplicate region"}
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="8" y="8" width="12" height="12" rx="2" ry="2"></rect>
              <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path>
            </svg>
          </button>
          
          <button 
            type="button"
            className="w-6 h-6 bg-destructive dark:bg-red-500 border border-background dark:border-background rounded-sm cursor-pointer flex items-center justify-center text-white hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
            title={t('common.delete') || "Delete region"}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      )}
      
      {isSelected && (
        <div
          className="absolute flex items-center justify-center cursor-se-resize pointer-events-auto"
          style={{
            right: -8,
            bottom: -8,
            width: 24,
            height: 24,
            zIndex: 30
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`w-5 h-5 ${isResizing ? 'bg-blue-500' : 'bg-yellow-500 dark:bg-yellow-400'} rounded-sm border border-white dark:border-gray-800 shadow-md flex items-center justify-center`}>
          </div>
        </div>
      )}
    </div>
  );
}
