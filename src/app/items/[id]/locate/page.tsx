"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2, MinusCircle, DatabaseZapIcon } from 'lucide-react';
import { 
  getInventoryItemById, 
  getLocationById, 
  getLocationRegions, 
  updateInventoryItem, // Assuming this can be used to update quantity
  type InventoryItem, // Import the type
  type Location,      // Import the type
  type Region         // Import the type
} from '@/lib/api';
import { useLanguage } from '@/lib/language';
import Link from 'next/link';
import Image from 'next/image'; // For displaying item image
import { LocationViewer } from '@/components/location-viewer';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function LocateItemPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consuming, setConsuming] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const itemId = parseInt(id);
      const itemData = await getInventoryItemById(itemId);
      setItem(itemData);

      if (itemData?.locationId) {
        const locData = await getLocationById(itemData.locationId);
        setLocation(locData);
        if (locData?.id) {
          const regData = await getLocationRegions(locData.id);
          setRegions(regData);
        }
      } else {
        // No location assigned to item
        setLocation(null);
        setRegions([]);
      }
    } catch (err) {
      console.error('Error fetching data for locate page:', err);
      setError(t('common.errorFetchingData'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConsume = async () => {
    if (!item || item.quantity <= 0) return;

    const originalItemState = { ...item }; // Preserve original item details

    setConsuming(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('name', item.name); // Required by backend, even if not changing
      formData.append('quantity', (item.quantity - 1).toString());
      
      // Append other existing item data if backend expects full updates or for completeness
      if (item.description) formData.append('description', item.description);
      if (item.locationId) formData.append('locationId', item.locationId.toString());
      if (item.regionId) formData.append('regionId', item.regionId.toString());
      // imageFilename is typically not sent in an update like this unless changing the image

      const updatedItemPartial = await updateInventoryItem(item.id, formData);
      
      // Merge: Prioritize data from API response, but ensure all fields are maintained
      setItem(prevItem => {
        if (!prevItem) return null; // Should not happen if item was present
        return {
          ...prevItem,          // Start with previous state (which includes imageFilename etc.)
          ...updatedItemPartial,  // Overlay with what the API returned (e.g. new quantity, updatedAt)
          // Ensure quantity is definitely updated from API response if available, or calculated
          quantity: updatedItemPartial.quantity !== undefined 
                      ? updatedItemPartial.quantity 
                      : (originalItemState.quantity > 0 ? originalItemState.quantity - 1 : 0),
        };
      });

    } catch (err: any) {
      console.error('Error consuming item:', err);
      setError(err.message || t('items.errorConsuming'));
      setItem(originalItemState); // Restore original item on error to prevent inconsistent state
    } finally {
      setConsuming(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center min-h-[70vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
        <div className="mt-6">
          <Link href="/inventory">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.backToInventory')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container mx-auto py-6 text-center">
        <p className="text-xl text-muted-foreground">{t('items.notFound')}</p>
        <div className="mt-6">
          <Link href="/inventory">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.backToInventory')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <Link href="/inventory">
          <Button variant="outline" size="icon" aria-label={t('common.back')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-4xl font-bold tracking-tight text-center flex-grow">
          {t('items.locateTitle')}: {item.name}
        </h1>
        <div className="w-10">{/* Spacer */}</div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Left Column: Item Info & Consume */} 
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">{item.name}</CardTitle>
            {item.description && <CardDescription className="text-md pt-1">{item.description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-6">
            {item.imageFilename && (
              <div className="relative aspect-video w-full rounded-lg overflow-hidden border bg-muted">
                <Image 
                  src={`/api/images/inventory/${item.imageFilename}`}
                  alt={item.name} 
                  layout="fill"
                  objectFit="contain"
                  className="p-2"
                />
              </div>
            )}
            <div className="flex justify-between items-center border-t pt-4">
              <p className="text-lg font-semibold">
                {t('items.quantity')}: <span className="text-primary text-xl">{item.quantity}</span>
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline"
                    disabled={item.quantity <= 0 || consuming || loading}
                    className="gap-2"
                  >
                    {consuming ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <MinusCircle className="h-5 w-5" />
                    )}
                    {t('items.consumeOne')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('items.consumeConfirmTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('items.consumeConfirmDescription', { name: item.name, quantity: item.quantity -1 })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConsume} disabled={consuming}>
                      {consuming ? t('common.processing') : t('items.confirmConsume')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Location Viewer */} 
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">{t('items.location')}</CardTitle>
            {!item.locationId && <CardDescription>{t('items.noLocationAssigned')}</CardDescription>}
          </CardHeader>
          <CardContent>
            {item.locationId && location && (
              <div className="min-h-[300px] md:min-h-[400px] flex flex-col items-center justify-center space-y-4">
                <h3 className="text-xl font-semibold text-center">{location.name}</h3>
                {location.imagePath ? (
                  <LocationViewer 
                    imageSrc={location.imagePath ? `locations/${location.imagePath}` : null}
                    regions={regions}
                    highlightedRegionId={item.regionId}
                    className="w-full h-auto max-h-[60vh] aspect-[4/3] rounded-md border bg-muted/20"
                  />
                ) : (
                  <div className="p-4 text-center text-muted-foreground bg-muted/30 rounded-md w-full aspect-video flex items-center justify-center">
                    {t('locations.noImageAvailable')}
                  </div>
                )}
                {item.regionId && regions.find(r => r.id === item.regionId) && (
                  <p className="text-center text-lg pt-2">
                    {t('items.region')}: <span className="font-semibold text-primary">{regions.find(r => r.id === item.regionId)?.name}</span>
                  </p>
                )}
                 {!item.regionId && item.locationId && (
                  <p className="text-center text-sm text-muted-foreground pt-2">{t('items.noRegionAssignedForItem')}</p>
                )}
              </div>
            )} 
            {!item.locationId && (
                 <div className="min-h-[300px] md:min-h-[400px] flex flex-col items-center justify-center space-y-2 p-4 bg-muted/10 rounded-md">
                    <DatabaseZapIcon className="w-16 h-16 text-muted-foreground/50" />
                    <p className="text-muted-foreground text-center">{t('items.noLocationInfoForItem')}</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 