import { Navigate, Route, Routes } from 'react-router-dom';
import { DEFAULT_SECTION } from './adminSections.js';
import AdminShell from './components/AdminShell.jsx';
import OrdersSection from './sections/OrdersSection.jsx';
import CatalogSection from './sections/CatalogSection.jsx';
import HomeSection from './sections/HomeSection.jsx';
import TextsSection from './sections/TextsSection.jsx';
import SettingsSection from './sections/SettingsSection.jsx';

const toDefault = <Navigate to={`/admin/${DEFAULT_SECTION}`} replace />;

/**
 * The signed-in admin, one address per section (/admin/catalog, /admin/orders…)
 * so a section survives a reload and the browser's Back button moves between
 * them. Mounted under /admin/* — see App.jsx.
 */
export default function AdminRoutes({ onLogout }) {
  return (
    <Routes>
      <Route element={<AdminShell onLogout={onLogout} />}>
        <Route index element={toDefault} />
        <Route path="orders" element={<OrdersSection />} />
        <Route path="catalog" element={<CatalogSection />} />
        <Route path="home" element={<HomeSection />} />
        <Route path="texts" element={<TextsSection />} />
        <Route path="settings" element={<SettingsSection />} />
        <Route path="*" element={toDefault} />
      </Route>
    </Routes>
  );
}
