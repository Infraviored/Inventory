"use client";

import React from 'react';
import InventoryItemForm from '@/components/inventory-item-form';
import { useLanguage } from '@/lib/language';

export default function AddItemPage() {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('items.addNewPageTitle')}</h1>
      </div>
      
      <div className="max-w-3xl mx-auto">
      <div className="bg-card rounded-lg shadow-sm p-6">
        <InventoryItemForm />
        </div>
      </div>
    </div>
  );
}
