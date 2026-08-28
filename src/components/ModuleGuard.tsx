import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import type { CompanyModule } from '@/lib/types';

/** Blocks direct-URL access to a module a Super Admin has disabled for this
 *  company — Sidebar.tsx hides the nav entry, this stops navigating there by
 *  URL too. Only owner sessions carry `enabledModules` today (see Sidebar's
 *  comment) — employees pass through unblocked until that's wired up. */
export function ModuleGuard({ module }: { module: CompanyModule }) {
  const role = useAuthStore((s) => s.role);
  const enabledModules = useAuthStore((s) => s.user?.enabledModules);

  if (role === 'user' && enabledModules && !enabledModules.includes(module)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
