"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Import language files
import en from '@/locales/en.json';
import de from '@/locales/de.json';

// Define available languages
export type Language = 'en' | 'de';
export const languages: Record<Language, string> = {
  en: 'English',
  de: 'Deutsch'
};

// Define translations type
export type Translations = typeof en;

// Create language context
type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Language provider component
interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  // Get initial language from localStorage or use browser language or default to English
  const getInitialLanguage = (): Language => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') as Language;
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'de')) {
        return savedLanguage;
      }
      
      const browserLanguage = navigator.language.split('-')[0];
      if (browserLanguage === 'de') {
        return 'de';
      }
    }
    return 'en';
  };

  const [language, setLanguageState] = useState<Language>(getInitialLanguage);
  
  // Get translations based on current language
  const translations = language === 'de' ? de : en;
  
  // Set language and save to localStorage
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
    }
  };
  
  // Translation function
  const t = (key: string): string => {
    // Split the key by dots to access nested properties
    const keys = key.split('.');
    let value: any = translations;
    
    // Navigate through the nested properties
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };
  
  // Set HTML lang attribute
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook to use language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
