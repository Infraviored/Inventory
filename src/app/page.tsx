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
      
      {/* Hero Search - Made larger and more prominent */}
      <div className="max-w-3xl mx-auto mt-8">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-8 rounded-xl shadow-sm">
          <h2 className="text-2xl font-semibold mb-4 text-center">{t('search.findItems')}</h2>
          <form onSubmit={handleSearch} className="flex w-full items-center space-x-2">
            <Input
              type="text"
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-12 text-lg"
              autoFocus
            />
            <Button type="submit" disabled={isSearching} size="lg" className="h-12 px-6">
              <Search className="mr-2 h-5 w-5" />
              {t('search.button')}
            </Button>
          </form>
          <div className="mt-3 text-sm text-muted-foreground text-center">
            {t('search.searchTip')}
          </div>
        </div>
      </div>
      
      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mt-8 space-y-6">
          <h2 className="text-2xl font-semibold text-center">{t('search.results')} ({searchResults.length})</h2>
          <div className="grid gap-4">
            {searchResults.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row">
                  {item.imagePath && (
                    <div className="w-full sm:w-32 h-32 flex-shrink-0">
                      <img 
                        src={item.imagePath} 
                        alt={item.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 p-4">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        {t('items.quantity')}: {item.quantity}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                        {item.description}
                      </p>
                    )}
                    {(item.locationName || item.regionName) && (
                      <div className="flex items-center mt-3 text-sm">
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {item.locationName && <span>{item.locationName}</span>}
                          {item.regionName && <span> / {item.regionName}</span>}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex sm:flex-col justify-between p-4 bg-muted/20 gap-2">
                    <Link href={`/items/${item.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        {t('common.edit')}
                      </Button>
                    </Link>
                    <Link href={`/items/${item.id}/locate`}>
                      <Button variant="outline" size="sm" className="w-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        {t('items.locate')}
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      {t('common.delete')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="flex justify-center mt-6">
            <Link href="/inventory">
              <Button variant="outline" size="lg" className="px-8">
                {t('inventory.viewAll')}
              </Button>
            </Link>
          </div>
        </div>
      )}
      
      {/* No Results */}
      {searchQuery && searchResults.length === 0 && !isSearching && (
        <div className="mt-8 text-center p-8 border rounded-lg bg-muted/10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium mb-2">{t('search.noResultsTitle')}</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {t('search.noResults')}
          </p>
          <Link href="/add-item">
            <Button size="lg">
              <Plus className="mr-2 h-4 w-4" />
              {t('items.addNew')}
            </Button>
          </Link>
        </div>
      )}
      
      {/* Quick Actions */}
      {!searchResults.length && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-12">
          <Link href="/add-item" className="block">
            <Card className="h-full hover:shadow-md transition-shadow border-primary/20">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{t('items.addNew')}</CardTitle>
                <CardDescription>{t('items.addNewDescription')}</CardDescription>
              </CardHeader>
              <CardFooter className="pt-0">
                <Button className="w-full">
                  {t('items.addNew')}
                </Button>
              </CardFooter>
            </Card>
          </Link>
          
          <Link href="/inventory" className="block">
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <CardTitle>{t('inventory.title')}</CardTitle>
                <CardDescription>{t('inventory.description')}</CardDescription>
              </CardHeader>
              <CardFooter className="pt-0">
                <Button variant="outline" className="w-full">
                  {t('inventory.viewAll')}
                </Button>
              </CardFooter>
            </Card>
          </Link>
          
          <Link href="/locations" className="block">
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <CardTitle>{t('locations.title')}</CardTitle>
                <CardDescription>{t('locations.description')}</CardDescription>
              </CardHeader>
              <CardFooter className="pt-0">
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
        <div className="max-w-5xl mx-auto mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">{t('items.recentItems')}</h2>
            <Link href="/inventory">
              <Button variant="ghost" size="sm">
                {t('common.viewAll')}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentItems.map((item) => (
              <Link key={item.id} href={`/items/${item.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow overflow-hidden">
                  {item.imagePath && (
                    <div className="w-full h-40 overflow-hidden">
                      <img 
                        src={item.imagePath} 
                        alt={item.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className={`pb-2 ${!item.imagePath ? 'pt-6' : ''}`}>
                    <CardTitle className="text-lg flex justify-between items-start">
                      <span>{item.name}</span>
                      {item.quantity && (
                        <span className="text-sm bg-muted px-2 py-1 rounded-full">
                          {item.quantity}
                        </span>
                      )}
                    </CardTitle>
                    {item.locationName && (
                      <CardDescription className="flex items-center mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {item.locationName}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pb-2">
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="pt-0 flex justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </span>
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
