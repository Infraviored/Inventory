"use client";

import { useLanguage } from '@/lib/language';
import { ThemeToggle } from './theme-toggle';
import { LanguageToggle } from './language-toggle';
import Link from 'next/link';

export function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/" className="text-2xl font-bold">
                {t('app.title')}
              </Link>
            </div>
            <nav className="hidden md:flex space-x-6">
              <Link href="/" className="hover:text-primary">
                {t('navigation.home')}
              </Link>
              <Link href="/inventory" className="hover:text-primary">
                {t('navigation.inventory')}
              </Link>
              <Link href="/locations" className="hover:text-primary">
                {t('navigation.locations')}
              </Link>
              <Link href="/add-item" className="hover:text-primary">
                {t('navigation.addItem')}
              </Link>
              <Link href="/search" className="hover:text-primary">
                {t('navigation.search')}
              </Link>
            </nav>
            <div className="flex items-center space-x-4">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-grow">
        {children}
      </main>
      
      <footer className="bg-card py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} {t('app.title')}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
