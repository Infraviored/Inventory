"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ArrowUpDown, 
  Search, 
  Plus, 
  Edit, 
  Trash, 
  MapPin,
  Filter,
  MoreHorizontal,
  SortAsc,
  SortDesc,
  List,
  Grid
} from 'lucide-react';
import { getInventoryItems, type InventoryItem } from '@/lib/api';
import { useLanguage } from '@/lib/language';

export default function InventoryListPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Fetch inventory items
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const data = await getInventoryItems();
        setItems(data);
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
      return searchQuery === '' || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('inventory.fullList')}</h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'bg-muted' : ''}
            title={t('inventory.listView')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? 'bg-muted' : ''}
            title={t('inventory.gridView')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Link href="/add-item">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('items.addNew')}
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Search and sort */}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <SortAsc className="h-4 w-4 mr-2" />
                  {t('common.sort')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('common.sortBy')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleSort('name')}>
                  {t('common.fields.name')} {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('quantity')}>
                  {t('items.quantity')} {sortField === 'quantity' && (sortDirection === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('location')}>
                  {t('items.location')} {sortField === 'location' && (sortDirection === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('updatedAt')}>
                  {t('common.lastUpdated')} {sortField === 'updatedAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortDirection('asc')}>
                  <SortAsc className="h-4 w-4 mr-2" />
                  {t('common.ascending')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortDirection('desc')}>
                  <SortDesc className="h-4 w-4 mr-2" />
                  {t('common.descending')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>
      
      {/* Items display */}
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
      ) : viewMode === 'grid' ? (
        // Grid view
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAndSortedItems.map((item) => (
            <Card key={item.id} className="overflow-hidden h-full flex flex-col">
              <div className="aspect-square w-full overflow-hidden bg-muted">
                {item.imagePath ? (
                  <img 
                    src={item.imagePath} 
                    alt={item.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    {t('common.noImage')}
                  </div>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold truncate">{item.name}</h3>
                  <span className="text-sm bg-muted px-2 py-0.5 rounded-full">
                    {item.quantity}
                  </span>
                </div>
                
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {item.description}
                  </p>
                )}
                
                {(item.locationName || item.regionName) && (
                  <p className="text-xs text-muted-foreground mt-2 flex-grow">
                    {item.locationName && <span>{t('items.location')}: {item.locationName}</span>}
                    {item.regionName && <span> / {item.regionName}</span>}
                  </p>
                )}
                
                <div className="flex justify-between items-center mt-4 pt-2 border-t">
                  <Link href={`/items/${item.id}`}>
                    <Button variant="ghost" size="sm">
                      {t('common.details')}
                    </Button>
                  </Link>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/items/${item.id}/locate`}>
                          <MapPin className="h-4 w-4 mr-2" />
                          {t('items.locate')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/items/${item.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          {t('common.edit')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild className="text-red-600">
                        <Link href={`/items/${item.id}/delete`}>
                          <Trash className="h-4 w-4 mr-2" />
                          {t('common.delete')}
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        // List view
        <div className="rounded-md border">
          <div className="divide-y">
            {filteredAndSortedItems.map((item) => (
              <div key={item.id} className="flex p-4 hover:bg-muted/50">
                <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  {item.imagePath ? (
                    <img 
                      src={item.imagePath} 
                      alt={item.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      {t('common.noImage')}
                    </div>
                  )}
                </div>
                
                <div className="ml-4 flex-1">
                  <div className="flex justify-between">
                    <h3 className="font-semibold">{item.name}</h3>
                    <span className="text-sm bg-muted px-2 py-0.5 rounded-full">
                      {t('items.quantity')}: {item.quantity}
                    </span>
                  </div>
                  
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {item.description}
                    </p>
                  )}
                  
                  {(item.locationName || item.regionName) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.locationName && <span>{t('items.location')}: {item.locationName}</span>}
                      {item.regionName && <span> / {item.regionName}</span>}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center ml-4 space-x-2">
                  <Link href={`/items/${item.id}/locate`}>
                    <Button variant="ghost" size="icon" title={t('items.locate')}>
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href={`/items/${item.id}`}>
                    <Button variant="ghost" size="icon" title={t('common.details')}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href={`/items/${item.id}/delete`}>
                    <Button variant="ghost" size="icon" title={t('common.delete')}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Summary */}
      {!loading && !error && filteredAndSortedItems.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {t('inventory.showing')} {filteredAndSortedItems.length} {t('inventory.of')} {items.length} {t('items.items')}
        </div>
      )}
    </div>
  );
}
