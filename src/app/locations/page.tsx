"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import LocationManagement from '@/components/location-management';

export default function LocationsPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Lagerorte verwalten</h1>
      </div>
      
      <div className="bg-card rounded-lg shadow-sm p-6">
        <LocationManagement />
      </div>
    </div>
  );
}
