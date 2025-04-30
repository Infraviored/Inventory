"use client";

import React, { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button'; // Or use a div for the trigger
import { cn } from '@/lib/utils'; 
import { Label } from './label';

interface ColorPickerPopoverProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  id?: string;
  triggerClassName?: string;
  popoverClassName?: string;
}

export function ColorPickerPopover({
  value,
  onChange,
  label,
  id,
  triggerClassName,
  popoverClassName
}: ColorPickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {label && <Label htmlFor={id} className="text-sm">{label}</Label>}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            className={cn(
              "w-8 h-8 rounded border border-input dark:border-border",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", // Add focus styles
              triggerClassName
            )}
            style={{ backgroundColor: value }}
            aria-label={label || "Select color"}
          />
        </PopoverTrigger>
        <PopoverContent 
           className={cn("w-auto p-0 border-none", popoverClassName)} // Remove padding for picker
           align="start" // Adjust alignment as needed
        >
          <HexColorPicker color={value} onChange={onChange} />
        </PopoverContent>
      </Popover>
    </div>
  );
} 