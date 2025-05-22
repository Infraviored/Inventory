"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  MapPin, 
  Save, 
  Trash, 
  ArrowLeft, 
  Camera, 
  Loader2 
} from 'lucide-react';
import { 
  getInventoryItemById, 
  getLocationById, 
  getLocationRegions, 
  getLocations,
  updateInventoryItem,
  deleteInventoryItem
} from '@/lib/api';
import { useLanguage } from '@/lib/language';
import Link from 'next/link';
import InventoryItemForm from '@/components/inventory-item-form';
import { LocationViewer } from '@/components/location-viewer';

export default function ItemPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showLocateDialog, setShowLocateDialog] = useState(false);
  const [blinkingRegion, setBlinkingRegion] = useState<boolean>(false);
  const [locateDialogLocationImage, setLocateDialogLocationImage] = useState<string | null>(null);
  const [locateDialogRegions, setLocateDialogRegions] = useState<any[]>([]);
  const [locateError, setLocateError] = useState<string | null>(null);
  
  // Fetch item data
  useEffect(() => {
    const fetchItemData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch item details
        const itemData = await getInventoryItemById(parseInt(id));
        setItem(itemData);
      } catch (err) {
        console.error('Error fetching item data:', err);
        setError(t('common.error'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchItemData();
  }, [id, t]);
  
  // NEW: Handle update submission from InventoryItemForm
  const handleUpdate = async (formData: FormData) => {
    try {
      setSaving(true);
      setError(null);
      
      // Call the update API
      await updateInventoryItem(parseInt(id), formData);
      
      // Show success message or redirect
      router.push('/inventory'); // Redirect back to inventory list
    } catch (err: any) { // Add type annotation for err
      console.error('Error updating item:', err);
      // Set error state to display in the form or globally
      setError(err.message || t('common.error'));
      // Consider passing setError down to InventoryItemForm if it has error display logic
    } finally {
      setSaving(false);
    }
  };
  
  // Handle delete
  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteInventoryItem(parseInt(id));
      router.push('/inventory');
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(t('common.error'));
    } finally {
      setDeleting(false);
    }
  };
  
  // Adjust Handle locate to fetch data
  const handleLocate = async () => { 
    if (!item?.locationId) { 
        setLocateError('Item has no location assigned.'); 
        setShowLocateDialog(true); // Still show dialog to display error
        return;
    }

    setShowLocateDialog(true);
    setLocateError(null);
    setBlinkingRegion(false); // Reset blink
    setLocateDialogLocationImage(null); // Reset image
    setLocateDialogRegions([]); // Reset regions
    
    try {
        // Fetch location details (including image)
        const locationData = await getLocationById(item.locationId);
        setLocateDialogLocationImage(locationData.imagePath); // Use the correct path from API response

        // Fetch regions for the location
        let fetchedRegions: any[] = [];
        if (locationData.id) { // Ensure locationData has an id to fetch regions for
            fetchedRegions = await getLocationRegions(locationData.id);
            setLocateDialogRegions(fetchedRegions); 
        }

        // Start blinking effect for the specific region if item has a regionId and it is found in fetchedRegions
        if (item.regionId && fetchedRegions.some(r => r.id === item.regionId)) {
            setBlinkingRegion(true);
            setTimeout(() => setBlinkingRegion(false), 5000); // Stop after 5s
        } else if (item.regionId) {
            console.warn(`Item's regionId ${item.regionId} not found in fetched regions for location ${locationData.id}`);
        }
        
    } catch (err) {
        console.error('Error fetching data for locate dialog:', err);
        setLocateError(t('common.error') + ': Failed to load location/region details.');
        // Keep dialog open to show error
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error && !item) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
        <div className="mt-4">
          <Link href="/inventory">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/inventory">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{item?.name}</h1>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleLocate}
          >
            <MapPin className="mr-2 h-4 w-4" />
            {t('items.locate')}
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash className="mr-2 h-4 w-4" />
                {t('common.delete')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('items.deleteConfirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('items.deleteConfirmDescription')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.deleting')}
                    </>
                  ) : (
                    t('common.delete')
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded my-4">
          <p>{error}</p>
        </div>
      )}
      
      <div className="max-w-3xl mx-auto">
        <InventoryItemForm 
          initialData={item} 
          onSubmit={handleUpdate}
          error={error}
          setError={setError}
        />
      </div>
      
      <Dialog open={showLocateDialog} onOpenChange={setShowLocateDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('items.locateTitle')}</DialogTitle>
            <DialogDescription>
              {t('items.locateDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 min-h-[300px] flex flex-col items-center justify-center">
            {locateError ? (
              <p className="text-red-500">{locateError}</p>
            ) : locateDialogLocationImage ? (
              <LocationViewer 
                imageSrc={locateDialogLocationImage}
                regions={locateDialogRegions}
                highlightedRegionId={blinkingRegion ? item?.regionId : null}
                className="w-full h-auto max-h-[70vh] aspect-[4/3]"
                defaultRegionBorderColor="#60a5fa"
                selectedRegionBorderColor="#ef4444"
              />
            ) : (
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>{t('common.loading')}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowLocateDialog(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
