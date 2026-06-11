'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, t as interpolate, type Language, type TranslationKey } from './translations';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  tr: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('sw');

  useEffect(() => {
    const stored = localStorage.getItem('norzah-lang') as Language | null;
    if (stored === 'sw' || stored === 'en') setLanguageState(stored);
  }, []);

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    localStorage.setItem('norzah-lang', lang);
  }

  function tr(key: TranslationKey, params?: Record<string, string | number>): string {
    const text = translations[language][key] ?? translations.sw[key] ?? key;
    return interpolate(text as string, params);
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, tr }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
