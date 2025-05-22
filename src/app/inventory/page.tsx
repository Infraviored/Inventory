"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  ArrowUpDown, 
  Search, 
  Plus, 
  Edit, 
  Trash, 
  MapPin,
  Filter,
  Loader2
} from 'lucide-react';
import { getInventoryItems, type InventoryItem, deleteInventoryItem } from '@/lib/api';
import { useLanguage } from '@/lib/language';
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

// Define interface for location
interface Location {
  id: number | null;
  name: string | null;
}

export default function InventoryPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [locationFilter, setLocationFilter] = useState('all');
  const [locations, setLocations] = useState<Location[]>([]);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch inventory items
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const data = await getInventoryItems();
        setItems(data);
        
        // Extract unique locations for filtering
        const uniqueLocations = [...new Set(
          data
            .filter(item => item.locationName)
            .map(item => ({ id: item.locationId, name: item.locationName }))
        )];
        setLocations(uniqueLocations);
      } catch (err) {
        console.error('Error fetching inventory items:', err);
        setError(t('common.error'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchItems();
  }, [t]);

  // Filter and sort items
  const filteredAndSortedItems = items
    .filter(item => {
      // Apply search filter
      const matchesSearch = searchQuery === '' || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Apply location filter
      const matchesLocation = locationFilter === 'all' || 
        (locationFilter === 'none' && !item.locationId) ||
        (item.locationId && item.locationId.toString() === locationFilter);
      
      return matchesSearch && matchesLocation;
    })
    .sort((a, b) => {
      // Handle sorting
      let comparison = 0;
      
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'quantity') {
        comparison = a.quantity - b.quantity;
      } else if (sortField === 'location') {
        const locA = a.locationName || '';
        const locB = b.locationName || '';
        comparison = locA.localeCompare(locB);
      } else if (sortField === 'updatedAt') {
        const dateA = new Date(a.updatedAt || '');
        const dateB = new Date(b.updatedAt || '');
        comparison = dateA.getTime() - dateB.getTime();
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Toggle sort direction or change sort field
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteInventoryItem(itemToDelete.id);
      setItems(prevItems => prevItems.filter(item => item.id !== itemToDelete.id));
      setItemToDelete(null);
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(t('common.errorDeleting'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('inventory.title')}</h1>
        <Link href="/add-item">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('items.addNew')}
          </Button>
        </Link>
      </div>
      
      {/* Search and filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="w-40">
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={t('locations.filter')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="none">{t('locations.none')}</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location.id?.toString()} value={location.id?.toString() || ''}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Inventory table */}
      <Card>
        {loading ? (
          <div className="p-8 text-center">
            <p>{t('common.loading')}</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            <p>{error}</p>
          </div>
        ) : filteredAndSortedItems.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              {searchQuery ? t('search.noResults') : t('inventory.empty')}
            </p>
            <Link href="/add-item">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('items.addNew')}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">{t('items.image')}</TableHead>
                  <TableHead className="min-w-[200px] cursor-pointer" onClick={() => handleSort('name')}>
                    <div className="flex items-center">
                      {t('common.fields.name')}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                      {sortField === 'name' && (
                        <span className="ml-1 text-xs">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('location')}>
                    <div className="flex items-center">
                      {t('items.location')}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                      {sortField === 'location' && (
                        <span className="ml-1 text-xs">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('quantity')}>
                    <div className="flex items-center">
                      {t('items.quantity')}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                      {sortField === 'quantity' && (
                        <span className="ml-1 text-xs">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('updatedAt')}>
                    <div className="flex items-center">
                      {t('common.lastUpdated')}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                      {sortField === 'updatedAt' && (
                        <span className="ml-1 text-xs">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="w-16 h-16 rounded-md overflow-hidden bg-muted">
                        {item.imageFilename ? (
                          <img 
                            alt={item.name} 
                            className="w-full h-full object-cover" 
                            src={`/api/images/inventory/${item.imageFilename}`} 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                            {t('items.noImage')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          {item.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.locationName ? (
                        <span className="text-sm">{item.locationName}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">{t('locations.none')}</span>
                      )}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Link href={`/items/${item.id}/locate`}>
                          <Button variant="outline" size="icon" title={t('items.locateAction')}>
                            <MapPin className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/items/${item.id}`}>
                          <Button variant="outline" size="icon" title={t('items.editAction')}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              title={t('items.deleteAction')} 
                              onClick={() => setItemToDelete(item)} 
                              className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          {itemToDelete && (
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('items.deleteConfirmTitle')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('items.deleteConfirmDescriptionForItem', { name: itemToDelete.name })}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setItemToDelete(null)}>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={handleDeleteItem}
                                  disabled={isDeleting}
                                  className="bg-destructive hover:bg-destructive-dark"
                                >
                                  {isDeleting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : null}
                                  {t('common.delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          )}
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
      
      {/* Summary */}
      {!loading && !error && filteredAndSortedItems.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {t('inventory.showing')} {filteredAndSortedItems.length} {t('inventory.of')} {items.length} {t('items.items')}
        </div>
      )}
    </div>
  );
} 