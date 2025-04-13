"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, ArrowRight } from 'lucide-react';
import { searchItems } from '@/lib/api';
import { useLanguage } from '@/lib/language';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentItems, setRecentItems] = useState([]);

  // Load recent items from local storage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedRecentItems = localStorage.getItem('recentItems');
        if (storedRecentItems) {
          setRecentItems(JSON.parse(storedRecentItems).slice(0, 5));
        }
      } catch (error) {
        console.error('Error loading recent items:', error);
      }
    }
  }, []);

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      const results = await searchItems(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching items:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">{t('app.title')}</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t('app.description')}
        </p>
      </div>
      
      {/* Central Search */}
      <div className="max-w-2xl mx-auto">
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
        
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-6 space-y-4">
            <h2 className="text-xl font-semibold">{t('search.results')} ({searchResults.length})</h2>
            <div className="grid gap-4">
              {searchResults.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="flex">
                    {item.imagePath && (
                      <div className="w-24 h-24 flex-shrink-0">
                        <img 
                          src={item.imagePath} 
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
              ))}
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
        
        {/* No Results */}
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
      </div>
      
      {/* Quick Actions */}
      {!searchResults.length && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Link href="/add-item" className="block">
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>{t('items.addNew')}</CardTitle>
                <CardDescription>{t('items.addNewDescription')}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('items.addNew')}
                </Button>
              </CardFooter>
            </Card>
          </Link>
          
          <Link href="/inventory" className="block">
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>{t('inventory.title')}</CardTitle>
                <CardDescription>{t('inventory.description')}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  {t('inventory.viewAll')}
                </Button>
              </CardFooter>
            </Card>
          </Link>
          
          <Link href="/locations" className="block">
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>{t('locations.title')}</CardTitle>
                <CardDescription>{t('locations.description')}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  {t('locations.manage')}
                </Button>
              </CardFooter>
            </Card>
          </Link>
        </div>
      )}
      
      {/* Recent Items */}
      {recentItems.length > 0 && !searchResults.length && (
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">{t('items.recentItems')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentItems.map((item) => (
              <Link key={item.id} href={`/items/${item.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    {item.locationName && (
                      <CardDescription>{item.locationName}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pb-2">
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" size="sm" className="ml-auto">
                      {t('common.details')}
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
