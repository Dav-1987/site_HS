import { useEffect, useState } from 'react';
import { getAuthStatus, logout as apiLogout } from '../admin/api.js';
import LoginScreen from '../admin/components/LoginScreen.jsx';
import CatalogEditor from '../admin/components/CatalogEditor.jsx';

// Root of the owner-only admin. Checks the session, then shows either the login
// screen or the catalog editor. The editor + its sub-components live under
// src/admin/ (see useCatalogEditor.js for the editor state).
export default function Admin() {
  const [authed, setAuthed] = useState(null); // null = checking

  useEffect(() => {
    getAuthStatus()
      .then((s) => setAuthed(!!s.authed))
      .catch(() => setAuthed(false));
  }, []);

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
      /* ignore */
    }
    setAuthed(false);
  };

  if (authed === null) {
    return <div className="flex min-h-screen items-center justify-center bg-surface text-primary/50">…</div>;
  }
  if (!authed) return <LoginScreen onSuccess={() => setAuthed(true)} />;
  return <CatalogEditor onLogout={handleLogout} />;
}
