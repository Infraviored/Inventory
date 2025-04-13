"use client";

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { AlertCircle } from 'lucide-react';

interface ImageInputProps {
  onImageChange: (file: File | null, croppedImage?: string) => void;
  label?: string;
  initialPreview?: string | null;
}

export function ImageInput({ onImageChange, label = 'Bild', initialPreview = null }: ImageInputProps) {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initialPreview);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setImage(file);
      setImageError(null);
      
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setPreview(result);
        
        // Create a temporary image to check if it loads properly
        const img = document.createElement('img');
        img.onload = () => {
          // Successfully loaded
          onImageChange(file, result);
        };
        img.onerror = () => {
          setImageError('Bild konnte nicht geladen werden. Bitte versuchen Sie ein anderes Format.');
          setPreview(null);
          onImageChange(null);
        };
        img.src = result;
      };
      reader.onerror = () => {
        setImageError('Fehler beim Lesen der Datei.');
        setPreview(null);
        onImageChange(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setPreview(null);
    setImageError(null);
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="image">{label}</Label>
      
      <div className="flex flex-col space-y-2">
        <input
          ref={fileInputRef}
          id="image"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="flex space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1"
          >
            Bild auswählen
          </Button>
          
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCameraCapture}
            className="flex-1"
          >
            Foto aufnehmen
          </Button>
        </div>
        
        {imageError && (
          <div className="flex items-center p-3 mt-2 text-sm border border-red-200 rounded-md bg-red-50 text-red-800">
            <AlertCircle className="h-4 w-4 mr-2" />
            {imageError}
          </div>
        )}
        
        {preview && (
          <div className="mt-2 space-y-2">
            <div className="relative aspect-video w-full overflow-hidden rounded-md border">
              <Image
                src={preview}
                alt="Vorschau"
                fill
                className="object-contain"
              />
            </div>
            
            <div className="flex space-x-2">
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleRemoveImage}
                className="flex-1"
              >
                Entfernen
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
