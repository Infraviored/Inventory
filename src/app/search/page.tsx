"use client";

import React from 'react';
import SearchForm from '@/components/search-form';

export default function SearchPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Objekte suchen</h1>
      </div>
      
      <div className="bg-card rounded-lg shadow-sm p-6">
        <SearchForm />
      </div>
    </div>
  );
}
