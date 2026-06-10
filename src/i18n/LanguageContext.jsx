import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { translations } from './translations.js';
import { useSettings } from '../settings/SettingsContext.jsx';

const STORAGE_KEY = 'hs-lang';
const DEFAULT_LANG = 'es';

const LanguageContext = createContext(null);

function getInitialLang() {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && translations[stored]) return stored;
  return DEFAULT_LANG;
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(getInitialLang);
  const { settings } = useSettings();

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  // t('some.key') → string. Prefers an admin-set override from settings, then
  // the bundled copy, then the default language, then the key itself.
  const overrides = settings?.texts;
  const t = useCallback(
    (key) => {
      const override = overrides?.[lang]?.[key];
      if (typeof override === 'string' && override) return override;
      return translations[lang]?.[key] ?? translations[DEFAULT_LANG]?.[key] ?? key;
    },
    [lang, overrides],
  );

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'es' ? 'en' : 'es'));
  }, []);

  const value = useMemo(
    () => ({ lang, setLang, toggleLang, t }),
    [lang, toggleLang, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
