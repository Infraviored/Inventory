import React from 'react';
import { InventoryItemForm } from '@/components/inventory-item-form';

export default function AddItemPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Objekt hinzufügen</h1>
      </div>
      
      <div className="bg-card rounded-lg shadow-sm p-6">
        <InventoryItemForm />
      </div>
    </div>
  );
}
