"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
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

  const processedInitialImageUrl = useMemo(() => {
    if (initialImageUrl) {
      // If it's an absolute URL (http, https) or a blob URL, use it as is
      if (initialImageUrl.startsWith('http') || initialImageUrl.startsWith('blob:')) {
        return initialImageUrl;
      }
      // If it looks like a category/filename path (e.g., 'locations/image.jpg')
      // transform it to the API endpoint path.
      // It should contain exactly one slash and no leading/trailing slashes for this simple check.
      const parts = initialImageUrl.split('/');
      if (parts.length === 2 && parts[0] && parts[1] && !initialImageUrl.startsWith('/') && !initialImageUrl.endsWith('/')) {
        // parts[0] is category, parts[1] is filename
        return `/api/images/${parts[0]}/${parts[1]}`;
      }
      
      // Fallback for any other non-absolute, non-blob, non-category/filename paths.
      // This might indicate an old format or an unexpected path. Log a warning.
      console.warn(`[ImageInput] Encountered unexpected initialImageUrl format: ${initialImageUrl}. Attempting to treat as direct path, but this may fail.`);
      // If it starts with a slash, assume it might be an attempt at a public path (though now incorrect)
      // Otherwise, it's unclear, return as is and let Next/Image try to resolve or error.
      return initialImageUrl.startsWith('/') ? initialImageUrl : `/${initialImageUrl}`;
    }
    return null;
  }, [initialImageUrl]);

  useEffect(() => {
    // Use processedInitialImageUrl for setting the preview
    if (!preview && processedInitialImageUrl) {
      setPreview(processedInitialImageUrl);
    }
    // If there's no user-selected image, and the current preview doesn't match the (processed) initial one, reset to initial.
    if (!image && preview !== processedInitialImageUrl && processedInitialImageUrl) {
      setPreview(processedInitialImageUrl);
    }
    // If there's no image, no initial URL, but preview exists (e.g. from a previous invalid initialImageUrl), clear it.
    if (!image && !processedInitialImageUrl && preview?.startsWith('/')) { // Keep check for / to avoid clearing blob previews too early
      setPreview(null);
    }
  }, [processedInitialImageUrl, preview, image]);

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
        
        {(preview) && (
          <div className="mt-2 space-y-2">
            <div className="relative aspect-video w-full overflow-hidden rounded-md border">
              <Image
                src={preview}
                alt={t('images.preview') || "Preview"}
                fill
                className="object-contain"
                onError={() => {
                  // If even the processed URL or blob fails, show an error or fallback
                  // This might happen if /uploads/filename.jpg is still not found (old comment)
                  // Or if /api/images/category/filename fails
                  setImageError(t('images.loadError') || 'Error loading image preview.');
                  setPreview(null); // Clear the broken preview
                }}
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
            
            {showUploadSuccessMessage && image && (
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
