'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

import { readJSON, writeJSON } from '@/lib/storage';
import { useTranslation, type Language } from '@/lib/i18n';

const LANGUAGE_STORAGE_KEY = 'schulplaner:language';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: ReturnType<typeof useTranslation>;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = readJSON<Language>(LANGUAGE_STORAGE_KEY, 'de');
      return saved === 'en' || saved === 'de' ? saved : 'de';
    } catch {
      return 'de';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    writeJSON(LANGUAGE_STORAGE_KEY, lang);
  };

  const t = useTranslation(language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

