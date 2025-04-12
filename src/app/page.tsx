import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Heim-Inventar</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/search" className="block">
          <div className="bg-card hover:bg-card/90 rounded-lg shadow-sm p-6 h-full transition-colors">
            <div className="flex flex-col h-full">
              <h2 className="text-xl font-semibold mb-2">Objekte suchen</h2>
              <p className="text-muted-foreground mb-4 flex-grow">
                Finden Sie Objekte schnell mit der Fuzzy-Suche
              </p>
              <Button variant="outline" className="w-full">
                <Search className="mr-2 h-4 w-4" />
                Zur Suche
              </Button>
            </div>
          </div>
        </Link>
        
        <Link href="/inventory" className="block">
          <div className="bg-card hover:bg-card/90 rounded-lg shadow-sm p-6 h-full transition-colors">
            <div className="flex flex-col h-full">
              <h2 className="text-xl font-semibold mb-2">Inventar verwalten</h2>
              <p className="text-muted-foreground mb-4 flex-grow">
                Alle Objekte auf einen Blick sehen und verwalten
              </p>
              <Button variant="outline" className="w-full">
                Zum Inventar
              </Button>
            </div>
          </div>
        </Link>
        
        <Link href="/locations" className="block">
          <div className="bg-card hover:bg-card/90 rounded-lg shadow-sm p-6 h-full transition-colors">
            <div className="flex flex-col h-full">
              <h2 className="text-xl font-semibold mb-2">Lagerorte verwalten</h2>
              <p className="text-muted-foreground mb-4 flex-grow">
                Lagerorte mit Regionen für präzise Objektplatzierung
              </p>
              <Button variant="outline" className="w-full">
                Zu den Lagerorten
              </Button>
            </div>
          </div>
        </Link>
      </div>
      
      <div className="flex justify-center">
        <Link href="/add-item">
          <Button size="lg">
            Neues Objekt hinzufügen
          </Button>
        </Link>
      </div>
    </div>
  );
}
