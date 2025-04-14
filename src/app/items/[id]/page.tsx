"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
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
  getAllLocations,
  updateInventoryItem,
  deleteInventoryItem
} from '@/lib/api';
import { useLanguage } from '@/lib/language';
import Link from 'next/link';

interface ItemParams {
  params: {
    id: string;
  };
}

export default function ItemPage({ params }: ItemParams) {
  const { t } = useLanguage();
  const router = useRouter();
  const { id } = params;
  
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showLocateDialog, setShowLocateDialog] = useState(false);
  const [locationImage, setLocationImage] = useState<string | null>(null);
  const [blinkingRegion, setBlinkingRegion] = useState<boolean>(false);
  
  // Fetch item data
  useEffect(() => {
    const fetchItemData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch item details
        const itemData = await getInventoryItemById(parseInt(id));
        setItem(itemData);
        
        // Set form values
        setItemName(itemData.name || '');
        setItemDescription(itemData.description || '');
        setItemQuantity(itemData.quantity || 1);
        setSelectedLocationId(itemData.locationId ? itemData.locationId.toString() : null);
        setSelectedRegionId(itemData.regionId ? itemData.regionId.toString() : null);
        
        // Fetch all locations for the dropdown
        const locationsData = await getAllLocations();
        setLocations(locationsData);
        
        // If item has a location, fetch its regions
        if (itemData.locationId) {
          const regionsData = await getLocationRegions(itemData.locationId);
          setRegions(regionsData);
          
          // Also fetch location details to get the image
          const locationData = await getLocationById(itemData.locationId);
          setLocationImage(locationData.imagePath);
        }
      } catch (err) {
        console.error('Error fetching item data:', err);
        setError(t('common.error'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchItemData();
  }, [id, t]);
  
  // Handle location change
  const handleLocationChange = async (locationId: string) => {
    setSelectedLocationId(locationId);
    setSelectedRegionId(null); // Reset region when location changes
    
    if (locationId) {
      try {
        // Fetch regions for the selected location
        const regionsData = await getLocationRegions(parseInt(locationId));
        setRegions(regionsData);
        
        // Fetch location details to get the image
        const locationData = await getLocationById(parseInt(locationId));
        setLocationImage(locationData.imagePath);
      } catch (err) {
        console.error('Error fetching location regions:', err);
      }
    } else {
      setRegions([]);
      setLocationImage(null);
    }
  };
  
  // Handle save
  const handleSave = async () => {
    if (!itemName.trim()) {
      setError(t('items.nameRequired'));
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('name', itemName);
      formData.append('description', itemDescription || '');
      formData.append('quantity', itemQuantity.toString());
      
      if (selectedLocationId) {
        formData.append('locationId', selectedLocationId);
      }
      
      if (selectedRegionId) {
        formData.append('regionId', selectedRegionId);
      }
      
      await updateInventoryItem(parseInt(id), formData);
      
      // Show success message and redirect
      router.push('/inventory');
    } catch (err) {
      console.error('Error updating item:', err);
      setError(t('common.error'));
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
  
  // Handle locate
  const handleLocate = () => {
    setShowLocateDialog(true);
    
    // Start blinking effect for the region
    if (selectedRegionId) {
      setBlinkingRegion(true);
      
      // Stop blinking after 5 seconds
      setTimeout(() => {
        setBlinkingRegion(false);
      }, 5000);
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
            disabled={!selectedLocationId}
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('items.details')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('items.name')}</Label>
                <Input
                  id="name"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder={t('items.namePlaceholder')}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">{t('items.description')}</Label>
                <Textarea
                  id="description"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder={t('items.descriptionPlaceholder')}
                  rows={4}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quantity">{t('items.quantity')}</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{t('items.location')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location">{t('items.selectLocation')}</Label>
                <Select 
                  value={selectedLocationId || ''} 
                  onValueChange={handleLocationChange}
                >
                  <SelectTrigger id="location">
                    <SelectValue placeholder={t('items.selectLocationPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('items.noLocation')}</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedLocationId && regions.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="region">{t('items.selectRegion')}</Label>
                  <Select 
                    value={selectedRegionId || ''} 
                    onValueChange={setSelectedRegionId}
                  >
                    <SelectTrigger id="region">
                      <SelectValue placeholder={t('items.selectRegionPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t('items.noRegion')}</SelectItem>
                      {regions.map((region) => (
                        <SelectItem key={region.id} value={region.id.toString()}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {selectedLocationId && regions.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  {t('regions.noRegions')}
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-end space-x-2">
            <Link href="/inventory">
              <Button variant="outline">
                {t('common.cancel')}
              </Button>
            </Link>
            <Button 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('common.save')}
                </>
              )}
            </Button>
          </div>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>{t('items.image')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              {item?.imagePath ? (
                <div className="w-full aspect-square rounded-md overflow-hidden">
                  <img 
                    src={item.imagePath} 
                    alt={item.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full aspect-square rounded-md bg-muted flex flex-col items-center justify-center">
                  <Camera className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {t('common.noImage')}
                  </p>
                </div>
              )}
              
              <Button className="mt-4" variant="outline">
                <Camera className="mr-2 h-4 w-4" />
                {t('items.uploadImage')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Locate Dialog */}
      <Dialog open={showLocateDialog} onOpenChange={setShowLocateDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('items.locateItem')}: {item?.name}</DialogTitle>
            <DialogDescription>
              {item?.locationName && (
                <span>
                  {t('items.location')}: {item.locationName}
                  {item.regionName && ` / ${item.regionName}`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative">
            {locationImage ? (
              <div className="border rounded-md overflow-hidden">
                <img 
                  src={locationImage} 
                  alt={item?.locationName} 
                  className="max-w-full h-auto"
                />
                
                {/* Overlay regions */}
                {selectedRegionId && regions.map((region) => {
                  if (region.id.toString() === selectedRegionId) {
                    const blinkClass = blinkingRegion ? 'animate-pulse bg-yellow-500/50' : 'bg-primary/30';
                    
                    return (
                      <div 
                        key={region.id}
                        className={`absolute border-2 border-yellow-500 ${blinkClass}`}
                        style={{
                          left: `${region.x}px`,
                          top: `${region.y}px`,
                          width: `${region.width}px`,
                          height: `${region.height}px`,
                        }}
                      >
                        <div className="absolute top-0 left-0 bg-yellow-500 text-white px-2 py-1 text-xs">
                          {region.name}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ) : (
              <div className="border rounded-md p-8 text-center">
                <p className="text-muted-foreground">
                  {t('locations.noImage')}
                </p>
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
