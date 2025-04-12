'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Search, Package, Home, FolderOpen, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MainNav() {
  const pathname = usePathname();
  
  const navItems = [
    {
      name: 'Home',
      href: '/',
      icon: <Home className="h-5 w-5" />,
    },
    {
      name: 'Suche',
      href: '/search',
      icon: <Search className="h-5 w-5" />,
    },
    {
      name: 'Inventar',
      href: '/inventory',
      icon: <Package className="h-5 w-5" />,
    },
    {
      name: 'Lagerorte',
      href: '/locations',
      icon: <FolderOpen className="h-5 w-5" />,
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 md:gap-6">
          <Link href="/" className="font-bold text-xl hidden md:block">
            Heim-Inventar
          </Link>
          <nav className="flex items-center gap-1 md:gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-2 py-1.5 md:px-3 md:py-2 text-sm font-medium rounded-md transition-colors",
                  pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <span className="md:mr-2">{item.icon}</span>
                <span className="hidden md:inline">{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/add-item">
            <Button size="sm" className="hidden md:flex">
              <Plus className="h-4 w-4 mr-2" />
              Objekt hinzufügen
            </Button>
            <Button size="icon" className="md:hidden">
              <Plus className="h-4 w-4" />
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-8">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <p className="text-center text-sm text-muted-foreground md:text-left">
          &copy; {new Date().getFullYear()} Heim-Inventar. Alle Rechte vorbehalten.
        </p>
        <p className="text-center text-sm text-muted-foreground md:text-right">
          Entwickelt für das Heimnetzwerk
        </p>
      </div>
    </footer>
  );
}
