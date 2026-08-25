import { lazy, Suspense, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { useCatalog } from './catalog/CatalogContext.jsx';
import Layout from './components/Layout.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import RouteFallback from './components/RouteFallback.jsx';
import { trackPixel } from './lib/track.js';

const Home = lazy(() => import('./pages/Home.jsx'));
const Catalog = lazy(() => import('./pages/Catalog.jsx'));
const Category = lazy(() => import('./pages/Category.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const Product = lazy(() => import('./pages/Product.jsx'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'));
const LegalNotice = lazy(() => import('./pages/LegalNotice.jsx'));
const Shipping = lazy(() => import('./pages/Shipping.jsx'));
const Returns = lazy(() => import('./pages/Returns.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const WallapopPanel = import.meta.env.DEV ? lazy(() => import('./pages/WallapopPanel.jsx')) : null;

/** Old /categoria/:slug URLs → canonical /:slug (kept so saved links survive).
 *  Spanish-only: this legacy URL form never existed under /en. */
function LegacyCategoryRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/${slug}`} replace />;
}

/** Old /producto/:id URLs → canonical /:categorySlug/:id (kept so saved links survive).
 *  Spanish-only: this legacy URL form never existed under /en. */
function LegacyProductRedirect() {
  const { id } = useParams();
  const { getProduct, loaded } = useCatalog();
  const found = getProduct(id);
  if (!found) return loaded ? <NotFound /> : null;
  return <Navigate to={`/${found.category.slug}/${id}`} replace />;
}

// Shared between the Spanish (/) and English (/en) route trees — relative
// paths so they resolve under whichever parent mounts them. Keeping this in
// one place instead of two copies is exactly the lesson from the sitemap/
// prerender route lists drifting apart (see src/routes.js).
const marketingRoutes = (
  <>
    <Route index element={<Home />} />
    <Route path="catalogo" element={<Catalog />} />
    <Route path="contacto" element={<Contact />} />
    <Route path="privacy-policy" element={<PrivacyPolicy />} />
    <Route path="legal-notice" element={<LegalNotice />} />
    <Route path="envios" element={<Shipping />} />
    <Route path="devoluciones" element={<Returns />} />
    <Route path=":slug" element={<Category />} />
    <Route path=":categorySlug/:id" element={<Product />} />
    <Route path="*" element={<NotFound />} />
  </>
);

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
        <Route
          path="/admin"
          element={
            <Suspense fallback={<RouteFallback fullPage />}>
              <Admin />
            </Suspense>
          }
        />
        {WallapopPanel && (
          <Route
            path="/wallapop"
            element={
              <Suspense fallback={<RouteFallback fullPage />}>
                <WallapopPanel />
              </Suspense>
            }
          />
        )}

        {/* Spanish — default, unprefixed. */}
        <Route path="/" element={<Layout />}>
          <Route path="categoria/:slug" element={<LegacyCategoryRedirect />} />
          <Route path="producto/:id" element={<LegacyProductRedirect />} />
          {marketingRoutes}
        </Route>

        {/* English mirror — same paths under /en (see src/i18n/routing.js). */}
        <Route path="/en" element={<Layout />}>
          {marketingRoutes}
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
