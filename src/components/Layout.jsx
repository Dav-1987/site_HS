import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import { gsap, ScrollTrigger } from '../lib/gsap.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useSettings } from '../settings/SettingsContext.jsx';
import JsonLd from './JsonLd.jsx';
import { organizationSchema, websiteSchema } from '../seo/schema.js';

export default function Layout() {
  const lenisRef = useRef(null);
  const location = useLocation();
  const { t } = useLanguage();
  const { settings } = useSettings();

  // Smooth scroll (desktop) wired into the GSAP ticker so ScrollTrigger stays
  // in sync. Skipped entirely when the user prefers reduced motion.
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true, wheelMultiplier: 1 });
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
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
          if (lenis) lenis.scrollTo(el, { offset: -80 });
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
  const isHome = location.pathname === '/';

  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd data={[organizationSchema(settings?.contact), websiteSchema()]} />
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[200] focus-visible:bg-background focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:text-primary focus-visible:ring-1 focus-visible:ring-accent"
      >
        {t('a11y.skipToContent')}
      </a>
      <Header />
      <main id="main-content" className={`flex-1 ${isHome ? '' : 'pt-14 lg:pt-20'}`}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
