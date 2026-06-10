import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import { gsap, ScrollTrigger } from '../lib/gsap.js';

export default function Layout() {
  const lenisRef = useRef(null);
  const location = useLocation();

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

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
