import type { ReactNode } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { Logo } from '@/components/brand/Logo';
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { ArrowLeft } from 'lucide-react';
import { useForceLightTheme } from '@/hooks/useForceLightTheme';

export function AuthLayout({
  children,
}: {
  children: ReactNode;
  // Accepted for prop-compatibility with `AuthWrapper`'s other branch
  // (`ElectronAuthLayout`) — the brand panel no longer carries login/signup
  // copy (the video backdrop replaced it), so there's no variant to apply.
  variant?: 'login' | 'signup';
}) {
  useForceLightTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);

  if (isAuthenticated) {
    return <Navigate to={role === 'client' ? '/portal' : '/'} replace />;
  }

  return (
    <div className="flex min-h-screen bg-bone-50">
      {/* Brand panel */}
      <AuthBrandPanel
        logo={<Logo tone="bone" eyebrow="Client portal for studios" />}
        content={null}
        footer={
          <>
            <p>© {new Date().getFullYear()} Portico</p>
            <div className="flex gap-6">
              <Link to="/privacy" className="transition-colors duration-hover ease-brand hover:text-ink-300">
                Privacy
              </Link>
              <Link to="/terms" className="transition-colors duration-hover ease-brand hover:text-ink-300">
                Terms
              </Link>
            </div>
          </>
        }
      />

      {/* Form panel */}
      <div className="relative flex flex-1 items-center justify-center px-6 py-12">
        <Link
          to="/"
          className="absolute left-6 top-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors duration-hover ease-brand hover:text-ink-800"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
