import { lazy, Suspense, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { useCatalog } from './catalog/CatalogContext.jsx';
import Layout from './components/Layout.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { trackPixel } from './lib/track.js';

const Home = lazy(() => import('./pages/Home.jsx'));
const Catalog = lazy(() => import('./pages/Catalog.jsx'));
const Category = lazy(() => import('./pages/Category.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const Product = lazy(() => import('./pages/Product.jsx'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'));
const LegalNotice = lazy(() => import('./pages/LegalNotice.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));

/** Old /categoria/:slug URLs → canonical /:slug (kept so saved links survive). */
function LegacyCategoryRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/${slug}`} replace />;
}

/** Old /producto/:id URLs → canonical /:categorySlug/:id (kept so saved links survive). */
function LegacyProductRedirect() {
  const { id } = useParams();
  const { getProduct, loaded } = useCatalog();
  const found = getProduct(id);
  if (!found) return loaded ? <NotFound /> : null;
  return <Navigate to={`/${found.category.slug}/${id}`} replace />;
}

const YANDEX_METRIKA_ID = 109965392;

export default function App() {
  const location = useLocation();
  const isFirstRender = useRef(true);
  // Previous full URL, sent as the `referer` on Yandex SPA hits so transition
  // sources aren't lost. Seeded with the landing URL on first render.
  const prevUrlRef = useRef(typeof window !== 'undefined' ? window.location.href : '');

  // Yandex.Metrika has no automatic SPA tracking, so we fire a hit on every
  // client-side route change, with title + previous URL (referer) so Webvisor
  // records the right page and the transition source is preserved.
  // GA4 is intentionally NOT called here: its Enhanced Measurement "page changes
  // based on browser history events" (on by default) already tracks SPA
  // navigations natively — a manual page_view would double-count.
  // Skip the first render: index.html already sends the initial pageview.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const path = location.pathname + location.search + location.hash;

    if (typeof window.ym === 'function') {
      window.ym(YANDEX_METRIKA_ID, 'hit', path, {
        title: document.title,
        referer: prevUrlRef.current,
      });
    }
    // Meta Pixel, like Yandex, has no automatic SPA tracking — fire a PageView
    // on each client-side route change. index.html already sent the initial one.
    trackPixel('PageView');
    prevUrlRef.current = window.location.origin + path;
  }, [location.pathname, location.search, location.hash]);

  return (
    // Reset on every navigation (key=pathname) so a crash on one page doesn't
    // permanently brick the rest of the SPA session — the boundary remounts
    // fresh as soon as the user moves to a different route.
    <ErrorBoundary key={location.pathname}>
      <Routes>
        {/* Admin lives outside the marketing Layout (no header/footer). */}
        <Route path="/admin" element={<Suspense fallback={null}><Admin /></Suspense>} />

        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/catalogo" element={<Catalog />} />
          <Route path="/categoria/:slug" element={<LegacyCategoryRedirect />} />
          <Route path="/producto/:id" element={<LegacyProductRedirect />} />
          <Route path="/contacto" element={<Contact />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/legal-notice" element={<LegalNotice />} />
          <Route path="/:slug" element={<Category />} />
          <Route path="/:categorySlug/:id" element={<Product />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
