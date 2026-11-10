import { Link } from './LocalizedLink.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';

// The Black Friday strip under the header's nav row: pure black, a gold-foil
// "11.11", a glowing BLACK FRIDAY, the offer in bright red and a small
// "¡Aproveche las ofertas! →" line under it all. It stays solid even while the
// header above it is transparent over the hero. Its height is --promo-h (set
// in Layout per breakpoint), which the page offsets read, so the layout per
// width is fixed rather than left to wrapping:
//   phones    — 11.11 BLACK FRIDAY / offer / dates / call to action
//   md–lg     — 11.11 BLACK FRIDAY / offer + dates / call to action
//   xl and up — everything on one row / call to action
export default function PromoBar() {
  const { t } = useLanguage();

  return (
    <Link
      to="/tocadores"
      className="group flex h-[var(--promo-h)] flex-col items-center justify-center gap-[5px] bg-[#000] px-4 text-center uppercase text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent md:gap-2"
    >
      <span className="flex flex-col items-center gap-[3px] md:gap-1.5 xl:flex-row xl:gap-6">
        <span className="flex items-center gap-3 whitespace-nowrap md:gap-4">
          <span className="text-gold-foil font-serif text-[1.65rem] font-bold leading-none tracking-[0.04em] md:text-[2rem] xl:text-[2.75rem]">
            11.11
          </span>
          <span className="text-glow font-serif text-[1.25rem] font-bold leading-none tracking-[0.1em] text-background md:text-[1.6rem] xl:text-[1.9rem]">
            {t('promo.bar.title')}
          </span>
        </span>

        <span aria-hidden="true" className="hidden h-8 w-px bg-background/25 xl:block" />

        <span className="flex flex-col items-center gap-[3px] whitespace-nowrap md:flex-row md:gap-3">
          <span className="text-red-glow text-[14px] font-extrabold leading-none tracking-[0.06em] md:text-[17px] xl:text-xl">
            {t('promo.bar.headline')}
          </span>
          <span className="text-[10.5px] leading-none tracking-[0.08em] text-background/85 md:text-[13px] md:tracking-[0.12em] xl:text-sm">
            {t('promo.bar.dates')}
          </span>
        </span>
      </span>

      <span className="mt-[5px] inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] font-semibold leading-none tracking-[0.2em] text-accent md:text-[11px] xl:text-xs">
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
