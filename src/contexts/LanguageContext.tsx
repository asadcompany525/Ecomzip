// ============================================================
// LanguageContext — Translation helper (English default)
// Future mein Urdu support add karna ho to yahan karo
// ============================================================

import React, { createContext, useContext, ReactNode } from 'react';

interface LanguageContextType {
  // t(english, urdu?) — abhi sirf English return karta hai
  t: (en: string, ur?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // Abhi sirf English — Urdu enable karna ho to yahan language state add karo
  const t = (en: string, _ur?: string) => en;

  return (
    <LanguageContext.Provider value={{ t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Usage: const { t } = useLanguage(); then t('Hello', 'السلام')
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
