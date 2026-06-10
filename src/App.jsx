import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
import Category from './pages/Category.jsx';
import Contact from './pages/Contact.jsx';
import Product from './pages/Product.jsx';
import NotFound from './pages/NotFound.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  return (
    <Routes>
      {/* Admin lives outside the marketing Layout (no header/footer). */}
      <Route path="/admin" element={<Admin />} />

      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/catalogo" element={<Catalog />} />
        <Route path="/categoria/:slug" element={<Category />} />
        <Route path="/producto/:id" element={<Product />} />
        <Route path="/contacto" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
