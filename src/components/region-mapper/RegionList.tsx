"use client";

import React from 'react';
import { ActiveRegion } from './types';
import { useLanguage } from '@/lib/language';
import { XIcon, PencilIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RegionListProps {
  regions: ActiveRegion[];
  selectedRegionId: string | null;
  onSelectRegion: (id: string) => void;
  onRemoveRegion: (id: string) => void;
  onEditRegion: (id: string) => void;
  isSelectMode?: boolean;
  className?: string;
}

export function RegionList({
  regions,
  selectedRegionId,
  onSelectRegion,
  onRemoveRegion,
  onEditRegion,
  isSelectMode = false,
  className = ''
}: RegionListProps) {
  const { t } = useLanguage();

  if (!regions || regions.length === 0) {
    return (
      <div className={`text-sm text-muted-foreground italic ${className}`}>
        {t('regions.noRegions') || 'No regions defined yet.'}
      </div>
    );
  }

  return (
    <div className={`border border-border rounded-md overflow-hidden ${className} dark:border-border`}>
      <ul className="divide-y divide-border dark:divide-border max-h-60 overflow-y-auto">
        {regions.map((region) => (
          <li
            key={region.id}
            className={`flex items-center justify-between px-3 py-2 text-sm transition-colors 
                        ${region.id === selectedRegionId 
                            ? 'bg-primary/10 text-primary dark:bg-primary/20' 
                            : 'hover:bg-muted/50 dark:hover:bg-muted/30'}
                      `}
          >
            <span 
                className="truncate pr-2 flex-grow cursor-pointer"
                title={region.name || t('regions.unnamed') || "Unnamed"}
                onClick={() => onSelectRegion(region.id)}
            >
              {region.name || <span className="italic text-muted-foreground">{t('regions.unnamed') || "Unnamed"}</span>}
            </span>
            {/* Action Buttons Container - Hide in Select Mode */}
            {!isSelectMode && (
                <div className="flex items-center flex-shrink-0 gap-1 ml-2">
                    {/* Edit Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-primary dark:hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditRegion(region.id);
                      }}
                      aria-label={t('common.edit') || "Edit region name"}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive dark:hover:text-destructive-foreground hover:bg-destructive/10 dark:hover:bg-destructive/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveRegion(region.id);
                      }}
                      aria-label={t('common.delete') || "Delete region"}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
