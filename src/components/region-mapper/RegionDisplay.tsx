"use client";

import React from 'react';
import { useLanguage } from '@/lib/language';

interface RegionDisplayProps {
  displayX: number;
  displayY: number;
  displayWidth: number;
  displayHeight: number;
  name: string | null;
  isSelected: boolean;
  isResizing: boolean;
  onDuplicate: () => void;
  onRemove: () => void;
  className?: string;
  defaultBorderColor: string;
  selectedBorderColor: string;
  borderWidth: number;
  isSelectMode?: boolean;
}

export function RegionDisplay({
  displayX,
  displayY,
  displayWidth,
  displayHeight,
  name,
  isSelected,
  isResizing,
  onDuplicate,
  onRemove,
  className = '',
  defaultBorderColor,
  selectedBorderColor,
  borderWidth,
  isSelectMode = false
}: RegionDisplayProps) {
  const { t } = useLanguage();

  const baseClasses = "absolute";
  const zIndex = isSelected ? 20 : 10;

  // Determine border styles based on props and state
  const borderColor = isSelected ? selectedBorderColor : defaultBorderColor;
  const bgColor = isSelected ? `${selectedBorderColor}1A` : `${defaultBorderColor}1A`; // Approx bg opacity

  return (
    <div
      className={`${baseClasses} ${className}`}
      style={{
        left: `${displayX}px`,
        top: `${displayY}px`,
        width: `${displayWidth}px`,
        height: `${displayHeight}px`,
        pointerEvents: 'none',
        zIndex: zIndex,
        border: `${borderWidth}px solid ${borderColor}`,
        backgroundColor: bgColor,
      }}
    >
      <div 
        className={`absolute top-0 left-0 px-1 text-xs font-medium pointer-events-auto
                     ${isSelected ? 'bg-yellow-500 text-yellow-50 dark:bg-yellow-400 dark:text-yellow-900' 
                                 : 'bg-primary text-primary-foreground dark:bg-primary'}`}
        title={name || t('regions.unnamed') || "Unnamed"}
      >
        <span className="block overflow-hidden text-ellipsis whitespace-nowrap max-w-[100px]">
            {name || t('regions.unnamed') || "Unnamed"}
        </span>
      </div>
      
      {/* Action buttons (Duplicate, Remove) - Hide in Select Mode */}
      {isSelected && !isSelectMode && (
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
      
      {/* Resize Handle - Hide in Select Mode */}
      {isSelected && !isSelectMode && (
        <div
          className="absolute flex items-center justify-center cursor-se-resize pointer-events-auto"
          style={{
            right: -8,
            bottom: -8,
            width: 24,
            height: 24,
            zIndex: 30
          }}
        >
          <div className={`w-5 h-5 ${isResizing ? 'bg-blue-500' : 'bg-yellow-500 dark:bg-yellow-400'} rounded-sm border border-white dark:border-gray-800 shadow-md flex items-center justify-center`}>
          </div>
        </div>
      )}
    </div>
  );
}
