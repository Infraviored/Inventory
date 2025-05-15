"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '@/lib/language';

interface ImageInputProps {
  onImageChange: (file: File | null, croppedImage?: string) => void;
  label?: string;
  initialPreview?: string | null;
  hideLabel?: boolean;
  showUploadSuccessMessage?: boolean;
  initialImageUrl?: string | null;
}

export function ImageInput({ onImageChange, label, initialPreview = null, hideLabel = false, showUploadSuccessMessage = true, initialImageUrl = null }: ImageInputProps) {
  const { t } = useLanguage();
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initialPreview);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!preview && initialImageUrl) {
      setPreview(initialImageUrl);
    }
    if (!image && preview !== initialImageUrl && initialImageUrl) {
      setPreview(initialImageUrl);
    }
    if (!image && !initialImageUrl && preview?.startsWith('/')) {
      setPreview(null);
    }
  }, [initialImageUrl, preview, image]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setImage(file);
      setImageError(null);
      
      // Use URL.createObjectURL instead of FileReader for previews
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      
      // Create a temporary image to check if it loads properly
      const img = document.createElement('img');
      img.onload = () => {
        // Successfully loaded
        onImageChange(file, objectUrl);
      };
      img.onerror = () => {
        setImageError('Bild konnte nicht geladen werden. Bitte versuchen Sie ein anderes Format.');
        URL.revokeObjectURL(objectUrl);
        setPreview(null);
        onImageChange(null);
      };
      img.src = objectUrl;
    }
  };

  // Clean up object URLs when component unmounts
  React.useEffect(() => {
    return () => {
      // Clean up the object URL when preview changes or component unmounts
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

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
      {!hideLabel && <Label htmlFor="image">{label}</Label>}
      
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
            {t('images.selectImage') || 'Select Image'}
          </Button>
          
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCameraCapture}
            className="flex-1"
          >
            {t('images.takePhoto') || 'Take Photo'}
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
                alt={t('images.preview') || "Preview"}
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
                {t('images.remove') || 'Remove'}
              </Button>
            </div>
            
            {showUploadSuccessMessage && (
            <div className="p-3 border border-blue-200 rounded-md bg-blue-50 text-blue-800 text-sm">
              <p className="font-medium">{t('images.uploadSuccess') || 'Image uploaded successfully!'}</p>
              <p>{t('images.defineRegions') || 'You can now define regions on this image.'}</p>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
