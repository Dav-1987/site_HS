import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useCatalog } from './catalog/CatalogContext.jsx';
import Layout from './components/Layout.jsx';

const Home = lazy(() => import('./pages/Home.jsx'));
const Catalog = lazy(() => import('./pages/Catalog.jsx'));
const Category = lazy(() => import('./pages/Category.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const Product = lazy(() => import('./pages/Product.jsx'));
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

export default function App() {
  return (
    <Routes>
      {/* Admin lives outside the marketing Layout (no header/footer). */}
      <Route path="/admin" element={<Suspense fallback={null}><Admin /></Suspense>} />

      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/catalogo" element={<Catalog />} />
        <Route path="/categoria/:slug" element={<LegacyCategoryRedirect />} />
        <Route path="/producto/:id" element={<LegacyProductRedirect />} />
        <Route path="/contacto" element={<Contact />} />
        <Route path="/:slug" element={<Category />} />
        <Route path="/:categorySlug/:id" element={<Product />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
