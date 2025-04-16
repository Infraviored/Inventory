"use client";

import React, { useState, useEffect } from 'react';
import { ActiveRegion } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/lib/language';

interface RegionFormProps {
  region: ActiveRegion | null;
  onUpdateRegionName: (id: string, name: string) => void;
  onRemoveRegion: (id: string) => void;
  onDuplicateRegion: (id: string) => void;
  onClose: () => void;
}

export function RegionForm({
  region,
  onUpdateRegionName,
  onRemoveRegion,
  onDuplicateRegion,
  onClose,
}: RegionFormProps) {
  const [name, setName] = useState("");
  const { t } = useLanguage();

  useEffect(() => {
    if (region) {
      setName(region.name);
    }
  }, [region]);

  if (!region) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (region) {
      onUpdateRegionName(region.id, name);
    }
    onClose();
  };

  const handleRemove = () => {
    if (region) {
      onRemoveRegion(region.id);
    }
    onClose();
  };

  const handleDuplicate = () => {
    if (region) {
      onDuplicateRegion(region.id);
    }
    onClose();
  };

  return (
    <div className="p-4 bg-background border border-border rounded-md shadow-md dark:border-border dark:shadow-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="region-name" className="block text-sm font-medium text-foreground">
            {t('regions.regionName') || "Region Name"}
          </label>
          <Input
            id="region-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('regions.enterRegionName') || "Enter region name"}
            className="w-full dark:border-border"
            autoFocus
          />
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <Button type="submit" className="flex-1">
            {t('common.save') || "Save"}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleDuplicate}
            className="flex-1 dark:border-border dark:hover:bg-muted"
          >
            {t('common.duplicate') || "Duplicate"}
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleRemove}
            className="flex-1"
          >
            {t('common.delete') || "Delete"}
          </Button>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={onClose}
            className="flex-1 dark:hover:bg-muted"
          >
            {t('common.cancel') || "Cancel"}
          </Button>
        </div>
      </form>
    </div>
  );
}
