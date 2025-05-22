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
  Trash, 
  ArrowLeft, 
  Loader2 
} from 'lucide-react';
import { 
  getInventoryItemById, 
  updateInventoryItem,
  deleteInventoryItem
} from '@/lib/api';
import { useLanguage } from '@/lib/language';
import Link from 'next/link';
import InventoryItemForm from '@/components/inventory-item-form';

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
            <Button variant="outline" size="icon" aria-label={t('common.back')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">
            {item ? `${t('items.editTitle')}: ${item.name}` : t('items.editTitle')}
          </h1>
        </div>
        <div className="flex space-x-2">
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
      
      {error && !saving && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      )}
      
      {item && (
        <InventoryItemForm 
          onSubmit={handleUpdate} 
          initialData={item} 
          error={error}      // Pass general error state to form
          setError={setError}  // Allow form to set/clear general error state
        />
      )}
      {saving && (
        <div className="fixed inset-0 bg-white/50 flex items-center justify-center z-50">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">{t('common.saving')}</p>
        </div>
      )}
    </div>
  );
}
