"use client";

import { useState, useEffect, useCallback } from 'react';
import { getLocations, deleteLocation, Location } from '@/lib/api';
import { LocationForm } from './location-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface LocationRegion {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface LocationFormInitialData {
    id: number;
    name: string;
    description: string | null;
    locationType: string | null;
    imagePath: string | null;
    parentId: number | null;
    regions: LocationRegion[];
}

export default function LocationManagement({ parentId }: { parentId?: number }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editingLocationDetails, setEditingLocationDetails] = useState<LocationFormInitialData | null>(null);
  const [isEditingLoading, setIsEditingLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLocations(parentId, parentId === undefined);
      setLocations(data);
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError('Failed to fetch locations');
    } finally {
      setLoading(false);
    }
  }, [parentId]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this location? This may also affect items stored here.')) {
      try {
        await deleteLocation(id);
        setLocations(prevLocations => prevLocations.filter(loc => loc.id !== id));
        if (editingLocation?.id === id) {
           setEditingLocation(null);
        }
      } catch (err: any) {
        console.error('Error deleting location:', err);
        setError(`Failed to delete location: ${err.message || 'Unknown error'}`);
      }
    }
  };

  const fetchLocationDetails = useCallback(async (location: Location) => {
    if (!location) return;
    
    const controller = new AbortController();
    const signal = controller.signal;

    setIsEditingLoading(true);
    setEditError(null);
    setEditingLocationDetails(null);

    try {
      console.log(`[LocationManagement] Fetching details for location ID: ${location.id}`);
      const [locationRes, regionsRes] = await Promise.all([
        fetch(`/api/locations/${location.id}`, { signal }),
        fetch(`/api/locations/${location.id}/regions`, { signal })
      ]);

      if (signal.aborted) {
          console.log(`[LocationManagement] Fetch aborted for ID: ${location.id}`);
          return;
      }

      if (!locationRes.ok) throw new Error(`Location fetch failed: ${locationRes.statusText}`);
      if (!regionsRes.ok) throw new Error(`Regions fetch failed: ${regionsRes.statusText}`);

      const fetchedLocationData = await locationRes.json();
      const fetchedRegionsData = await regionsRes.json();

      if (signal.aborted) {
          console.log(`[LocationManagement] State update aborted for ID: ${location.id}`);
          return;
      }

      console.log('[LocationManagement] Fetched Location Details:', fetchedLocationData);
      console.log('[LocationManagement] Fetched Regions:', fetchedRegionsData);

      const detailsForForm: LocationFormInitialData = {
          id: fetchedLocationData.id,
          name: fetchedLocationData.name || '',
          description: fetchedLocationData.description || null,
          locationType: fetchedLocationData.locationType || null,
          imagePath: fetchedLocationData.imagePath || null,
          parentId: fetchedLocationData.parentId !== undefined ? fetchedLocationData.parentId : null,
          regions: Array.isArray(fetchedRegionsData) ? fetchedRegionsData.map((r: any) => ({
              name: r.name || '',
              x: r.x ?? 0,
              y: r.y ?? 0,
              width: r.width ?? 0,
              height: r.height ?? 0
           })) : [],
      };
      
      setEditingLocationDetails(detailsForForm);

    } catch (err: any) {
       if (!signal.aborted) {
           console.error(`Error fetching details for location ${location.id}:`, err);
           setEditError(`Failed to load location details: ${err.message || 'Unknown error'}`);
       }
    } finally {
       if (!signal.aborted) {
           setIsEditingLoading(false);
       }
    }
    return () => controller.abort();

  }, []);

  useEffect(() => {
    let abortFetch: (() => void) | undefined;
    if (editingLocation) {
      fetchLocationDetails(editingLocation).then(cleanup => {
          abortFetch = cleanup; 
      });
    } else {
      setEditingLocationDetails(null);
      setIsEditingLoading(false);
      setEditError(null);
    }
    return () => {
        if (abortFetch) {
            console.log("[LocationManagement Effect Cleanup] Aborting in-flight fetch if any.")
            abortFetch();
        }
    }
  }, [editingLocation, fetchLocationDetails]);

  const handleSuccess = useCallback(() => {
    setShowAddDialog(false);
    setEditingLocation(null);
    fetchLocations();
  }, [fetchLocations]);

  if (loading) {
    return <div className="p-4 text-center">Loading locations...</div>;
  }

  if (error) {
    return <div className="p-4 text-destructive text-center">Error: {error}</div>;
  }

  const renderLoadingSkeleton = () => (
    <div className="space-y-6 p-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-8 w-1/4" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-8 w-1/4" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-8 w-1/4" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-10 w-full mt-4" />
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        {/* <h1 className="text-2xl font-bold">Locations {parentId ? `(Sub-locations)` : `(Root)`}</h1> */}
      </div>

      {locations.length === 0 ? (
        <div className="text-center p-8 bg-muted/50 rounded-lg">
          <p className="text-muted-foreground">No locations found. Add one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((location) => (
            <div
              key={location.id}
              className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-card"
            >
              <div className="relative h-48 bg-muted/50 flex items-center justify-center">
                {location.imagePath ? (
                  <img
                    src={location.imagePath}
                    alt={location.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : null}
                <span className="absolute text-muted-foreground text-sm pointer-events-none">
                     {!location.imagePath ? 'No image' : ''}
                 </span>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2 truncate" title={location.name}>{location.name}</h3>
                {location.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2" title={location.description}>{location.description}</p>
                )}
                <div className="flex space-x-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingLocation(location)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(location.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end mt-6">
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogTrigger asChild>
          <Button variant="default" className="fixed bottom-6 right-6 shadow-lg">
             Add New Location
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
            <DialogDescription>
              Fill in the details for the new location.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <LocationForm
              key="add-location-dialog-form"
              parentId={parentId}
              locationId={null}
              initialData={null}
              onSuccess={handleSuccess}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingLocation !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEditingLocation(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Location: {editingLocation?.name || '...'}</DialogTitle>
            <DialogDescription>
              Update the details for this location.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {isEditingLoading && renderLoadingSkeleton()}
            {!isEditingLoading && editError && (
              <div className="p-4 text-destructive bg-destructive/10 rounded-md text-center">
                {editError}
              </div>
            )}
            {!isEditingLoading && !editError && editingLocationDetails && (
              <LocationForm
                key={editingLocationDetails.id}
                locationId={editingLocationDetails.id}
                parentId={editingLocationDetails.parentId}
                initialData={editingLocationDetails}
                onSuccess={handleSuccess}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
