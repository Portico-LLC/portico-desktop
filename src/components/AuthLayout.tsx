import type { ReactNode } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { Logo } from '@/components/brand/Logo';
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { Check } from 'lucide-react';
import { useForceLightTheme } from '@/hooks/useForceLightTheme';

const FEATURES = [
  'Invite clients into a private, branded portal',
  'Track projects, tasks, and milestones together',
  'Send invoices and settle up without chasing emails',
  'Chat in real time — no more client email threads',
  'Ask Brain about your studio — powered by OpenAI, never used to train it',
];

export function AuthLayout({ children }: { children: ReactNode }) {
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
        content={
          <>
            <h2
              className="animate-fade-up font-display text-[40px] font-medium leading-[1.15] tracking-[-0.02em] text-bone-50"
              style={{ animationDelay: '80ms' }}
            >
              The front door between your studio and your clients.
            </h2>
            <p
              className="animate-fade-up mt-6 max-w-sm text-[15px] leading-relaxed text-ink-300"
              style={{ animationDelay: '160ms' }}
            >
              Projects, files, invoices, and conversations — one calm workspace
              for the work you ship and the clients you serve.
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

            <blockquote
              className="animate-fade-up relative mt-12 rounded-lg border border-ink-800 bg-ink-900 py-6 pl-6 pr-6"
              style={{ animationDelay: '320ms' }}
            >
              <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] rounded-l-lg bg-brass-500" />
              <p className="font-display text-lg leading-snug text-bone-100">
                “Portico replaced four tools for our studio — clients finally have
                a front door.”
              </p>
              <footer className="mt-3 text-xs text-ink-400">
                Maya Chen · Principal, Common Form Studio
              </footer>
            </blockquote>
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
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
