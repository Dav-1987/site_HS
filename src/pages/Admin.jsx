import { useEffect, useState } from 'react';
import { getAuthStatus, logout as apiLogout } from '../admin/api.js';
import LoginScreen from '../admin/components/LoginScreen.jsx';
import AdminRoutes from '../admin/AdminRoutes.jsx';

// Root of the owner-only admin. Checks the session, then shows either the login
// screen or the admin's sections, at whichever /admin/* address was opened. The
// admin lives under src/admin/ (see AdminRoutes.jsx and AdminShell.jsx).
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
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center bg-surface text-primary/75"
      >
        Загрузка…
      </div>
    );
  }
  if (!authed) return <LoginScreen onSuccess={() => setAuthed(true)} />;
  return <AdminRoutes onLogout={handleLogout} />;
}
