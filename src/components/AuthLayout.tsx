import type { ReactNode } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { Logo } from '@/components/brand/Logo';
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { ArrowLeft, Check } from 'lucide-react';
import { useForceLightTheme } from '@/hooks/useForceLightTheme';

const FEATURES = [
  'Invite clients into a private, branded portal',
  'Track projects, tasks, and milestones together',
  'Send invoices and settle up without chasing emails',
  'Chat in real time — no more client email threads',
  'Ask Brain about your studio — powered by OpenAI, never used to train it',
];

const COPY = {
  login: {
    headline: 'The front door between your studio and your clients.',
    subhead:
      'Projects, files, invoices, and conversations — one calm workspace for the work you ship and the clients you serve.',
  },
  signup: {
    headline: "Set up your studio's front door in minutes.",
    subhead: 'Invite your first client, import your projects, and send your first invoice — today.',
  },
} as const;

export function AuthLayout({ children, variant = 'login' }: { children: ReactNode; variant?: 'login' | 'signup' }) {
  useForceLightTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const copy = COPY[variant];

  if (isAuthenticated) {
    return <Navigate to={role === 'client' ? '/portal' : '/'} replace />;
  }

  return (
    <div className="flex min-h-screen bg-bone-50">
      {/* Brand panel */}
      <AuthBrandPanel
        logo={<Logo tone="bone" eyebrow="Client portal for studios" />}
        content={
          <>
            <h2
              key={copy.headline}
              className="animate-fade-up font-display text-[40px] font-medium leading-[1.15] tracking-[-0.02em] text-bone-50"
              style={{ animationDelay: '80ms' }}
            >
              {copy.headline}
            </h2>
            <p
              key={copy.subhead}
              className="animate-fade-up mt-6 max-w-sm text-[15px] leading-relaxed text-ink-300"
              style={{ animationDelay: '160ms' }}
            >
              {copy.subhead}
            </p>

            <ul className="animate-fade-up mt-10 space-y-4" style={{ animationDelay: '240ms' }}>
              {FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm bg-pine-800">
                    <Check size={12} strokeWidth={3} className="text-brass-400" />
                  </span>
                  <span className="text-sm leading-relaxed text-ink-200">{item}</span>
                </li>
              ))}
            </ul>
          </>
        }
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
