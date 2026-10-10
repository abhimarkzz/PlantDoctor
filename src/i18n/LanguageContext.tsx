import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { SupportedLanguage, TranslationDictionary } from './types';
import { SUPPORTED_LANGUAGES } from './types';
import { TRANSLATIONS } from './translations';

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: TranslationDictionary;
  locale: string;
  speechLocale: string;
  availableLanguages: typeof SUPPORTED_LANGUAGES;
}

const STORAGE_KEY = 'plant_doctor_language';

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  initialLanguage,
}: {
  children: ReactNode;
  initialLanguage?: SupportedLanguage;
}) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (initialLanguage) return initialLanguage;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
      if (saved && (saved === 'en' || saved === 'hi' || saved === 'te' || saved === 'ta')) {
        return saved;
      }
      // Check browser language
      const navLang = navigator.language.toLowerCase();
      if (navLang.startsWith('hi')) return 'hi';
      if (navLang.startsWith('te')) return 'te';
      if (navLang.startsWith('ta')) return 'ta';
    }
    return 'en';
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, lang);
        document.documentElement.lang = lang;
      } catch {
        // Ignore localStorage errors
      }
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const value = useMemo(() => {
    const currentOpt = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
    return {
      language,
      setLanguage,
      t: TRANSLATIONS[language] || TRANSLATIONS.en,
      locale: currentOpt.locale,
      speechLocale: currentOpt.speechLocale,
      availableLanguages: SUPPORTED_LANGUAGES,
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if rendered outside provider
    const fallbackOpt = SUPPORTED_LANGUAGES[0];
    return {
      language: 'en',
      setLanguage: () => {},
      t: TRANSLATIONS.en,
      locale: fallbackOpt.locale,
      speechLocale: fallbackOpt.speechLocale,
      availableLanguages: SUPPORTED_LANGUAGES,
    };
  }
  return context;
}
