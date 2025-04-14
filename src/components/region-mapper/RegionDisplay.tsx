"use client";

import React from 'react';
import { ActiveRegion } from './types';

interface RegionDisplayProps {
  region: ActiveRegion;
  isSelected: boolean;
  onToggleResize: (id: string) => void;
}

export function RegionDisplay({ region, isSelected, onToggleResize }: RegionDisplayProps) {
  return (
    <div 
      key={region.id}
      className={`absolute border-2 ${isSelected ? 'border-yellow-500' : 'border-primary'} ${isSelected ? 'bg-yellow-500/30' : 'bg-primary/30'}`}
      style={{
        left: `${region.x}px`,
        top: `${region.y}px`,
        width: `${region.width}px`,
        height: `${region.height}px`,
      }}
    >
      {/* Region name label */}
      <div className={`absolute top-0 left-0 px-1 py-0.5 text-xs ${isSelected ? 'bg-yellow-500' : 'bg-primary'} text-primary-foreground`}>
        {region.name || 'Unnamed'}
      </div>
      
      {/* Region dimensions label */}
      <div className="absolute bottom-0 right-0 px-1 py-0.5 text-xs bg-background/80 text-foreground">
        {Math.round(region.width)}×{Math.round(region.height)}
      </div>
      
      {/* Resize handle */}
      {isSelected && (
        <div 
          className="absolute bottom-0 right-0 w-4 h-4 bg-yellow-500 border border-background rounded-sm cursor-se-resize"
          style={{
            transform: 'translate(50%, 50%)'
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
