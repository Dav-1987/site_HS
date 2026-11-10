import { useEffect, useRef, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import CookieBanner from './CookieBanner.jsx';
import RouteFallback from './RouteFallback.jsx';
import { gsap, ScrollTrigger } from '../lib/gsap.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useSettings } from '../settings/SettingsContext.jsx';
import JsonLd from './JsonLd.jsx';
import { organizationSchema, websiteSchema } from '../seo/schema.js';
import { stripLangPrefix } from '../i18n/routing.js';
import { isPromoBarActive } from '../data/promoBar.js';

export default function Layout() {
  const lenisRef = useRef(null);
  const location = useLocation();
  const { t, lang } = useLanguage();
  const { settings } = useSettings();

  // Smooth scroll (desktop) wired into the GSAP ticker so ScrollTrigger stays
  // in sync. Skipped entirely when the user prefers reduced motion.
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;

    let teardown;
    import('lenis').then(({ default: Lenis }) => {
      const lenis = new Lenis({ duration: 1.1, smoothWheel: true, wheelMultiplier: 1 });
      lenisRef.current = lenis;

      lenis.on('scroll', ScrollTrigger.update);
      const tick = (time) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      teardown = () => {
        gsap.ticker.remove(tick);
        lenis.destroy();
        lenisRef.current = null;
      };
    });

    return () => teardown?.();
  }, []);

  // Scroll handling on navigation: jump to top, or to a #hash target.
  useEffect(() => {
    const lenis = lenisRef.current;
    const { hash } = location;

    if (hash) {
      // Wait a frame for the target to render.
      const id = window.setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) {
          // The fixed header's real height, promo strip included.
          const headerH = document.querySelector('header')?.offsetHeight ?? 80;
          if (lenis) lenis.scrollTo(el, { offset: -headerH });
          else el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 80);
      return () => window.clearTimeout(id);
    }

    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
    // Recalculate triggers after route content swaps in.
    ScrollTrigger.refresh();
    return undefined;
  }, [location]);

  // The header is fixed (overlapping content). The home hero sits under it on
  // purpose; every other page needs top padding equal to the header height.
  const isHome = stripLangPrefix(location.pathname).path === '/';
  // While the promo strip is up the header grows by --promo-h; every offset
  // that clears the header (page padding, mobile menu, hero eyebrow) adds it.
  const promo = isPromoBarActive();

  return (
    <div
      className={`flex min-h-screen flex-col ${promo ? '[--promo-h:5.75rem] md:[--promo-h:6rem] xl:[--promo-h:5.75rem]' : ''}`}
    >
      <JsonLd data={[organizationSchema(settings?.contact), websiteSchema(lang)]} />
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[200] focus-visible:bg-background focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:text-primary focus-visible:ring-1 focus-visible:ring-accent"
      >
        {t('a11y.skipToContent')}
      </a>
      <Header promo={promo} />
      <main
        id="main-content"
        className={`flex-1 ${
          isHome ? '' : 'pt-[calc(3.5rem+var(--promo-h))] lg:pt-[calc(5rem+var(--promo-h))]'
        }`}
      >
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CookieBanner />
    </div>
  );
}
