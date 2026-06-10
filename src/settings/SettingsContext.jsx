import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { defaultSettings, mergeSettings } from '../data/settings.js';

const SettingsContext = createContext(null);
const CACHE_KEY = 'hs-settings-v1';

function getInitialSettings() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return mergeSettings(JSON.parse(cached));
  } catch {}
  return defaultSettings;
}

/**
 * Live site settings (hero image + UI-copy overrides). Starts from the
 * localStorage cache (instant first paint with the last-known image), then
 * hydrates from /api/settings. Saves the fresh value back to localStorage so
 * the next load is also flash-free. Falls back to the bundled default when
 * both cache and API are unavailable.
 */
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(getInitialSettings);

  useEffect(() => {
    let alive = true;
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data?.settings) {
          setSettings(mergeSettings(data.settings));
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(data.settings)); } catch {}
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo(() => ({ settings }), [settings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
