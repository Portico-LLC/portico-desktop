import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';

export function ElectronAuthLayout({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);

  if (isAuthenticated) {
    return <Navigate to={role === 'client' ? '/portal' : '/'} replace />;
  }

  return (
    <div className="flex min-h-[calc(100vh-var(--app-titlebar-height))] items-center justify-center bg-bone-50">
      <div className="w-full max-w-md px-6">{children}</div>
    </div>
  );
}
