"use client";

import React, { useRef, useState } from 'react';
import { Label } from './label'; 
import { cn } from '@/lib/utils'; // Assuming you have a cn utility

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  id?: string;
  className?: string;
}

export function ColorPicker({ 
  value,
  onChange,
  label,
  id,
  className
}: ColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalValue, setInternalValue] = useState(value); // Keep internal state for input

  // Update internal state when prop changes
  React.useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInternalValue(newValue);
    onChange(newValue); // Call the passed onChange handler
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && <Label htmlFor={id} className="text-sm cursor-pointer" onClick={handleClick}>{label}</Label>}
      <div 
        className="w-8 h-8 rounded border border-border cursor-pointer dark:border-border"
        style={{ backgroundColor: internalValue }}
        onClick={handleClick}
        title="Click to change color"
      />
      {/* Hidden actual color input */}
      <input
        ref={inputRef}
        id={id}
        type="color"
        value={internalValue}
        onChange={handleInputChange}
        className="absolute w-0 h-0 opacity-0 pointer-events-none"
      />
    </div>
  );
} 