import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

const STORAGE_KEY = 'hs-cookie-banner-dismissed';

export default function CookieBanner() {
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === '1',
  );

  if (dismissed) return null;

  const dismiss = () => {
    window.localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookies"
      className="fixed bottom-4 left-4 right-4 z-[90] max-w-sm rounded-md border border-primary/10 bg-background/85 p-4 shadow-floating backdrop-blur-sm sm:left-auto sm:right-4"
    >
      <p className="text-xs leading-relaxed text-secondary">{t('cookie.message')}</p>
      <div className="mt-3 flex justify-end gap-3">
        <button
          type="button"
          onClick={dismiss}
          className="text-[11px] uppercase tracking-[0.15em] text-primary/50 transition-colors hover:text-primary"
        >
          {t('cookie.reject')}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="bg-primary px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] text-background transition-colors hover:bg-accent"
        >
          {t('cookie.accept')}
        </button>
      </div>
    </div>
  );
}
