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
    <div className="mt-4 p-3 border rounded-md space-y-3">
      <h4 className="font-medium text-sm">{t('regions.definedRegions')} ({regions.length})</h4>
      <div className="max-h-40 overflow-y-auto">
        <ul className="space-y-2">
          {regions.map((region) => (
            <li 
              key={region.id} 
              className={`flex justify-between items-center p-2 rounded-md cursor-pointer
                        ${region.isSelected ? 'bg-yellow-500/10 border border-yellow-500' : 'bg-background hover:bg-muted'}`}
              onClick={() => onSelectRegion(region.id)}
            >
              <div className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 bg-primary"
                  style={{
                    aspectRatio: `${region.width} / ${region.height}`
                  }}
                />
                <span>{region.name || t('regions.unnamed')}</span>
              </div>
              <div className="flex space-x-1">
                <button
                  type="button"
                  className="p-1 text-red-500 hover:bg-red-100 rounded-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveRegion(region.id);
                  }}
                  aria-label={t('common.delete')}
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
