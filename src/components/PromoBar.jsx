import { Link } from './LocalizedLink.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';

// The Black Friday strip under the header's nav row. Charcoal with the gold of
// the brand, so it reads as the shop's own voice rather than a pasted-on ad,
// and it stays solid even while the header above it is transparent over the
// hero. Its height is --promo-h (set in Layout), which the page offsets read.
// Phones get two short lines instead of one squeezed one, so nothing wraps or
// gets cut down to an abbreviation on a 360px screen.
export default function PromoBar() {
  const { t } = useLanguage();

  return (
    <Link
      to="/tocadores"
      className="group flex h-[var(--promo-h)] flex-col items-center justify-center gap-1 bg-primary px-4 text-center uppercase text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent md:flex-row md:gap-6"
    >
      <span className="flex items-center gap-3 whitespace-nowrap md:gap-5">
        <span className="text-gold-foil font-serif text-[1.75rem] font-bold leading-none tracking-[0.04em] md:text-[2.5rem]">
          11.11
        </span>
        <span className="text-[13px] font-semibold leading-none tracking-[0.2em] md:text-base">
          {t('promo.bar.title')}
        </span>
      </span>
      <span aria-hidden="true" className="hidden text-background/40 md:inline">
        ·
      </span>
      <span className="whitespace-nowrap text-[10.5px] leading-none tracking-[0.08em] text-background/85 md:text-sm md:tracking-[0.2em] md:text-background">
        {t('promo.bar.dates')}
      </span>
      <span className="hidden items-center gap-1.5 whitespace-nowrap text-sm font-semibold leading-none tracking-[0.2em] text-accent lg:inline-flex">
        {t('promo.bar.cta')}
        <span
          aria-hidden="true"
          className="transition-transform duration-300 group-hover:translate-x-1"
        >
          →
        </span>
      </span>
    </Link>
  );
}
