import { createContext, useContext, useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { translations } from './translations.js';
import { useSettings } from '../settings/SettingsContext.jsx';
import { stripLangPrefix, withLang } from './routing.js';

const DEFAULT_LANG = 'es';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  // The URL is the single source of truth for language — not a client-side
  // preference — so a crawler (or anyone) visiting /en/... always gets English,
  // and /catalogo always gets Spanish, with no hidden state involved.
  const location = useLocation();
  const { lang } = stripLangPrefix(location.pathname);
  const { settings } = useSettings();

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // t('some.key') → string. Prefers an admin-set override from settings, then
  // the bundled copy, then the default language, then the key itself.
  const overrides = settings?.texts;
  const t = useCallback(
    (key) => {
      const override = overrides?.[lang]?.[key];
      if (typeof override === 'string' && override) {
        return override === '---' ? '' : override;
      }
      return translations[lang]?.[key] ?? translations[DEFAULT_LANG]?.[key] ?? key;
    },
    [lang, overrides],
  );

  // Turns an ES-form app path ("/catalogo", "/tocadores-loft") into the
  // current language's URL ("/catalogo" or "/en/catalogo").
  const localize = useCallback((path) => withLang(path, lang), [lang]);

  const value = useMemo(() => ({ lang, t, localize }), [lang, t, localize]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
