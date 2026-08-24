import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { isElectron } from '@/lib/isElectron';
import { LandingPage } from '@/pages/LandingPage';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const hydrate = useAuthStore((s) => s.hydrate);
  const [ready, setReady] = useState(false);
  const location = useLocation();

  useEffect(() => {
    hydrate();
    setReady(true);
  }, [hydrate]);

  if (!ready) return null;
  if (!isAuthenticated) {
    // The web app's public entry point — logged-out visitors hitting "/" see the
    // marketing landing page instead of bouncing straight to /login. Electron
    // has no such page and keeps going straight to login, as before.
    if (location.pathname === '/' && !isElectron) return <LandingPage />;
    return <Navigate to="/login" replace />;
  }
  if (role === 'client') return <Navigate to="/portal" replace />;

  return <Outlet />;
}

export function OwnerOnlyRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const hydrate = useAuthStore((s) => s.hydrate);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
    setReady(true);
  }, [hydrate]);

  if (!ready) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === 'employee') return <Navigate to="/" replace />;

  return <Outlet />;
}

export function ClientProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const hydrate = useAuthStore((s) => s.hydrate);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
    setReady(true);
  }, [hydrate]);

  if (!ready) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role !== 'client') return <Navigate to="/" replace />;

  return <Outlet />;
}
