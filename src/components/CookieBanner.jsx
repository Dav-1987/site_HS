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
      aria-describedby="cookie-message"
      className="fixed bottom-4 left-4 right-4 z-[90] max-w-sm rounded-md border border-primary/10 bg-background/85 p-4 shadow-floating backdrop-blur-sm sm:left-auto sm:right-4"
    >
      <p id="cookie-message" className="text-sm leading-relaxed text-secondary">
        {t('cookie.message')}
      </p>
      <div className="mt-3 flex justify-end gap-3">
        <button
          type="button"
          onClick={dismiss}
          className="touch-target px-2 text-xs uppercase tracking-[0.15em] text-primary/70 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {t('cookie.reject')}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="touch-target bg-primary px-4 text-xs uppercase tracking-[0.15em] text-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          {t('cookie.accept')}
        </button>
      </div>
    </div>
  );
}
