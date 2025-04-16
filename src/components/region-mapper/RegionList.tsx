"use client";

import React from 'react';
import { ActiveRegion } from './types';
import { useLanguage } from '@/lib/language';

interface RegionListProps {
  regions: ActiveRegion[];
  onSelectRegion: (regionId: string) => void;
  onRemoveRegion: (regionId: string) => void;
}

export function RegionList({ regions, onSelectRegion, onRemoveRegion }: RegionListProps) {
  const { t } = useLanguage();

  if (regions.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 p-3 border border-border rounded-md dark:border-border space-y-3">
      <h4 className="font-medium text-sm text-foreground">
        {t('regions.definedRegions') || "Defined Regions"} ({regions.length})
      </h4>
      <div className="max-h-[400px] overflow-y-auto">
        <ul className="space-y-2">
          {regions.map((region) => (
            <li 
              key={region.id} 
              className={`flex justify-between items-center p-2 rounded-md cursor-pointer
                         ${region.isSelected 
                           ? 'bg-yellow-500/10 border border-yellow-500 dark:bg-yellow-500/5 dark:border-yellow-400' 
                           : 'bg-background hover:bg-muted dark:hover:bg-muted/50'}`}
              onClick={() => onSelectRegion(region.id)}
            >
              <div className="flex items-center space-x-2">
                <div 
                  className={`w-4 h-4 ${region.isSelected ? 'bg-yellow-500 dark:bg-yellow-400' : 'bg-primary dark:bg-primary'}`}
                  style={{
                    aspectRatio: `${region.width} / ${region.height}`
                  }}
                />
                <span className="text-foreground">
                  {region.name || t('regions.unnamed') || "Unnamed region"}
                </span>
              </div>
              <div className="flex space-x-1">
                <button
                  type="button"
                  className="p-1 text-destructive hover:bg-destructive/10 rounded-sm dark:text-red-400 dark:hover:bg-red-900/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveRegion(region.id);
                  }}
                  aria-label={t('common.delete') || "Delete"}
                  title={t('common.delete') || "Delete"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
