"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/lib/language';
import { searchItems, type InventoryItem } from '@/lib/api';

export default function SearchPage() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Load recent searches from local storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedSearches = localStorage.getItem('recentSearches');
        if (storedSearches) {
          setRecentSearches(JSON.parse(storedSearches));
        }
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);

  // Save recent searches to local storage
  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return;
    
    const updatedSearches = [
      query,
      ...recentSearches.filter(s => s !== query)
    ].slice(0, 5);
    
    setRecentSearches(updatedSearches);
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
      } catch (error) {
        console.error('Error saving recent searches:', error);
      }
    }
  };

  // Handle search
  const handleSearch = async (e?: React.FormEvent<HTMLFormElement> | { preventDefault: () => void }) => {
    if (e && typeof (e as React.FormEvent<HTMLFormElement>).preventDefault === 'function') {
      (e as React.FormEvent<HTMLFormElement>).preventDefault();
    }
    
    if (!searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      const results = await searchItems(searchQuery);
      setSearchResults(results);
      saveRecentSearch(searchQuery);
    } catch (error) {
      console.error('Error searching items:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Filter results based on active tab
  const filteredResults = searchResults.filter((item: InventoryItem) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'withLocation') return item.locationId;
    if (activeTab === 'withoutLocation') return !item.locationId;
    return true;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('search.title')}</h1>
        <Link href="/add-item">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('items.addNew')}
          </Button>
        </Link>
      </div>
      
      {/* Search form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('search.findItems')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex w-full items-center space-x-2">
            <Input
              type="text"
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isSearching}>
              <Search className="mr-2 h-4 w-4" />
              {t('search.button')}
            </Button>
          </form>
          
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">{t('search.recentSearches')}:</p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((query, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery(query);
                      handleSearch({ preventDefault: () => {} });
                    }}
                  >
                    {query}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {t('search.results')} ({searchResults.length})
            </h2>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
                <TabsTrigger value="withLocation">{t('search.withLocation')}</TabsTrigger>
                <TabsTrigger value="withoutLocation">{t('search.withoutLocation')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="grid gap-4">
            {filteredResults.length > 0 ? (
              filteredResults.map((item: InventoryItem) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="flex">
                    {item.imageFilename && (
                      <div className="w-24 h-24 flex-shrink-0 bg-muted">
                        <img 
                          src={`/api/images/inventory/${item.imageFilename}`}
                          alt={item.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 p-4">
                      <div className="flex justify-between">
                        <h3 className="font-semibold">{item.name}</h3>
                        <span className="text-sm text-muted-foreground">
                          {t('items.quantity')}: {item.quantity}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {item.description}
                        </p>
                      )}
                      {(item.locationName || item.regionName) && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {item.locationName && <span>{t('items.location')}: {item.locationName}</span>}
                          {item.regionName && <span> / {item.regionName}</span>}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col justify-between p-4 bg-muted/30">
                      <Link href={`/items/${item.id}`}>
                        <Button variant="ghost" size="sm">
                          {t('common.details')}
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </Link>
                      <Link href={`/items/${item.id}/locate`}>
                        <Button variant="ghost" size="sm">
                          {t('items.locate')}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center p-8">
                <p className="text-muted-foreground">
                  {t('search.noResultsForFilter')}
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-center mt-4">
            <Link href="/inventory">
              <Button variant="outline">
                {t('inventory.viewAll')}
              </Button>
            </Link>
          </div>
        </div>
      )}
      
      {/* No results */}
      {searchQuery && searchResults.length === 0 && !isSearching && (
        <div className="mt-6 text-center p-8 border rounded-lg">
          <p className="text-muted-foreground mb-4">
            {t('search.noResults')}
          </p>
          <Link href="/add-item">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('items.addNew')}
            </Button>
          </Link>
        </div>
      )}
      
      {/* Initial state - no search performed yet */}
      {!searchQuery && searchResults.length === 0 && (
        <div className="text-center p-8 border rounded-lg">
          <p className="text-muted-foreground mb-4">
            {t('search.enterQuery')}
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/inventory">
              <Button variant="outline">
                {t('inventory.viewAll')}
              </Button>
            </Link>
            <Link href="/add-item">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('items.addNew')}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
