import { useLanguage } from '../i18n/LanguageContext.jsx';

/** Visible, screen-reader-announced fallback for lazy route chunks. */
export default function RouteFallback({ fullPage = false }) {
  const { t } = useLanguage();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t('common.loading')}
      className={`w-full bg-background px-6 py-12 md:px-12 lg:px-20 ${
        fullPage ? 'min-h-screen' : 'min-h-[60vh]'
      }`}
    >
      <span className="sr-only">{t('common.loading')}</span>
      <div aria-hidden="true" className="mx-auto max-w-6xl animate-pulse">
        <div className="h-3 w-28 bg-primary/10" />
        <div className="mt-5 h-10 w-3/4 max-w-xl bg-primary/10" />
        <div className="mt-4 h-4 w-full max-w-md bg-primary/10" />
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-8">
          {[0, 1, 2].map((item) => (
            <div key={item} className={`${item === 2 ? 'hidden md:block' : ''}`}>
              <div className="aspect-[4/5] bg-surface shimmer animate-shimmer" />
              <div className="mt-4 h-4 w-2/3 bg-primary/10" />
              <div className="mt-2 h-3 w-1/3 bg-primary/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
