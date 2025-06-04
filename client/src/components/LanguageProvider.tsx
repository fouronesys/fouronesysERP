import { useState, useEffect, ReactNode } from 'react';
import { LanguageContext, Language, translations, TranslationKeys } from '@/lib/i18n';

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>(() => {
    // Get saved language from localStorage or default to Spanish
    const saved = localStorage.getItem('fourOneLanguage');
    return (saved as Language) || 'es';
  });

  useEffect(() => {
    // Save language preference to localStorage
    localStorage.setItem('fourOneLanguage', language);
  }, [language]);

  const t = (key: keyof TranslationKeys) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}