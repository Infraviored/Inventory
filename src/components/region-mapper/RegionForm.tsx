"use client";

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ActiveRegion } from './types';
import { useLanguage } from '@/lib/language';

interface RegionFormProps {
  selectedRegion: ActiveRegion | null;
  onNameRegion: (name: string) => void;
  onCancel: () => void;
  position: { x: number; y: number };
  isMobile: boolean;
}

export function RegionForm({ 
  selectedRegion, 
  onNameRegion, 
  onCancel, 
  position, 
  isMobile 
}: RegionFormProps) {
  const { t } = useLanguage();
  const [regionName, setRegionName] = useState(selectedRegion?.name || '');
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Get form position
  const getFormPosition = () => {
    if (!selectedRegion) return {};
    
    // Position form next to region
    let x = position.x;
    let y = position.y;
    
    // Adjust position if it would go off-screen
    if (formRef.current) {
      const formRect = formRef.current.getBoundingClientRect();
      
      // Form width (approximate)
      const formWidth = isMobile ? window.innerWidth : 240;
      
      // Check if form would go off right edge
      if (x + formWidth > window.innerWidth) {
        // Position to the left of the region instead
        x = Math.max(0, selectedRegion.x - formWidth - 10);
      }
      
      // Check if form would go off bottom edge
      if (y + 200 > window.innerHeight) {
        // Position above the region instead
        y = Math.max(0, window.innerHeight - 200);
      }
    }
    
    return {
      left: `${x}px`,
      top: `${y}px`
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!regionName.trim()) {
      setError(t('regions.allRegionsNeedNames'));
      return;
    }
    
    console.log('Saving region name:', regionName);
    onNameRegion(regionName.trim());
    setError(null);
  };

  return (
    <div 
      ref={formRef}
      className={`absolute z-10 bg-background border rounded-md shadow-md p-3 ${isMobile ? 'w-full' : 'w-60'}`}
      style={getFormPosition()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-3">
        <h4 className="font-medium text-sm">{t('regions.nameRegion')}</h4>
        {error && (
          <div className="p-2 bg-red-100 text-red-700 rounded-md text-xs">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="region-name" className="text-xs">{t('regions.name')}</Label>
          <Input
            id="region-name"
            value={regionName}
            onChange={(e) => setRegionName(e.target.value)}
            placeholder={t('regions.enterName')}
            required
            className="h-8"
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              // Prevent Enter key from submitting the form and closing the region mapper
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
        </div>
        
        <div className="flex space-x-2">
          <Button 
            type="button" 
            size="sm" 
            className="flex-1"
            onClick={handleSubmit}
          >
            {t('common.save')}
          </Button>
          <Button 
            type="button" 
            size="sm" 
            variant="outline" 
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }} 
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}
