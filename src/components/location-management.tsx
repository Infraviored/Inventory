"use client";

import { useState, useEffect } from 'react';
import { getLocations, addLocation, deleteLocation, Location } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LocationForm } from './location-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog"

export default function LocationManagement({ parentId }: { parentId?: number }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const router = useRouter();

  const fetchLocations = async () => {
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
  };

  useEffect(() => {
    fetchLocations();
  }, [parentId]);

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this location? This may also affect items stored here.')) {
      try {
        await deleteLocation(id);
        setLocations(locations.filter(loc => loc.id !== id));
      } catch (err) {
        console.error('Error deleting location:', err);
        setError('Failed to delete location');
      }
    }
  };

  const handleSuccess = () => {
    setShowAddForm(false);
    setEditingLocation(null);
    fetchLocations();
  };

  if (loading) {
    return <div className="p-4 text-center">Loading locations...</div>;
  }

  if (error) {
    return <div className="p-4 text-destructive text-center">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <Button onClick={() => setShowAddForm(!showAddForm)} variant="default">
          {showAddForm ? 'Cancel' : 'Add New Location'}
        </Button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-6 border rounded-lg shadow bg-card">
          <h2 className="text-xl font-semibold mb-4">Add New Location</h2>
          <LocationForm parentId={parentId} onSuccess={handleSuccess} />
        </div>
      )}

      {locations.length === 0 && !showAddForm ? (
        <div className="text-center p-8 bg-muted/50 rounded-lg">
          <p className="text-muted-foreground">No locations found. Add a new location to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((location) => (
            <div
              key={location.id}
              className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-card"
            >
              <div className="relative h-48 bg-muted/50">
                {location.imagePath ? (
                  <img
                    src={location.imagePath}
                    alt={location.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-muted-foreground text-sm">No image</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2 truncate">{location.name}</h3>
                {location.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{location.description}</p>
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

      <Dialog
        open={editingLocation !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEditingLocation(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Location: {editingLocation?.name}</DialogTitle>
            <DialogDescription>
              Update the details for this location.
            </DialogDescription>
          </DialogHeader>
          {editingLocation && (
            <LocationForm
              locationId={editingLocation.id}
              parentId={editingLocation.parentId}
              onSuccess={handleSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
