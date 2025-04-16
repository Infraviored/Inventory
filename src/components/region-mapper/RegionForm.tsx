"use client";

import React, { useState, useEffect } from 'react';
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
  const [regionName, setRegionName] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Initialize name when selectedRegion changes
  useEffect(() => {
    if (selectedRegion) {
      setRegionName(selectedRegion.name || '');
    }
  }, [selectedRegion]);
  
  const handleSave = () => {
    if (!regionName.trim()) {
      setError(t('regions.allRegionsNeedNames'));
      return;
    }
    
    onNameRegion(regionName.trim());
  };
  
  // Handle form submission with Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };
  
  // Stop click propagation for all mouse events
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };
  
  return (
    <div 
      className={`bg-background border rounded-md shadow-md p-3 ${isMobile ? 'w-full' : 'w-60'}`}
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
      onMouseUp={stopPropagation}
      onMouseMove={stopPropagation}
      data-region-form="true"
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
            onKeyDown={handleKeyDown}
            placeholder={t('regions.enterName')}
            className="h-8"
            autoFocus
            onClick={stopPropagation}
            onMouseDown={stopPropagation}
          />
        </div>
        
        <div className="flex space-x-2">
          <Button 
            type="button" 
            size="sm" 
            className="flex-1"
            onClick={(e) => {
              stopPropagation(e);
              handleSave();
            }}
          >
            {t('common.save')}
          </Button>
          <Button 
            type="button" 
            size="sm" 
            variant="outline"
            onClick={(e) => {
              stopPropagation(e);
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
