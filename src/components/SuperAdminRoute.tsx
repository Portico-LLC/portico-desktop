import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSuperAdminAuthStore } from '@/store/superAdminAuth';

export function SuperAdminRoute() {
  const isAuthenticated = useSuperAdminAuthStore((s) => s.isAuthenticated);
  const hydrate = useSuperAdminAuthStore((s) => s.hydrate);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
    setReady(true);
  }, [hydrate]);

  if (!ready) return null;
  if (!isAuthenticated) return <Navigate to="/super-admin/login" replace />;

  return <Outlet />;
}
