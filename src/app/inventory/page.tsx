import React from 'react';
import { InventoryItems } from '@/components/inventory-items';

export default function InventoryPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Inventar</h1>
      </div>
      
      <div className="bg-card rounded-lg shadow-sm p-6">
        <InventoryItems />
      </div>
    </div>
  );
}
