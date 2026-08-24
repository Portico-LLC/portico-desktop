import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { ArrowLeft } from 'lucide-react';
import { useForceLightTheme } from '@/hooks/useForceLightTheme';

interface LegalLayoutProps {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}

export function LegalLayout({ title, effectiveDate, children }: LegalLayoutProps) {
  useForceLightTheme();

  return (
    <div className="min-h-screen bg-bone-50">
      <header className="border-b border-ink-200 bg-bone-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link to="/" className="transition-opacity duration-hover ease-brand hover:opacity-80">
            <Logo tone="ink" markSize={30} />
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors duration-hover ease-brand hover:text-ink-900"
          >
            <ArrowLeft size={15} />
            Back to sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass-700">Legal</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.02em] text-ink-900">
          {title}
        </h1>
        <p className="mt-3 text-sm text-ink-400">Effective {effectiveDate}</p>

        <div className="mt-10 space-y-10">{children}</div>
      </main>

      <footer className="border-t border-ink-200">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-8 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Portico</p>
          <div className="flex gap-5">
            <Link to="/privacy" className="transition-colors duration-hover ease-brand hover:text-ink-600">
              Privacy Policy
            </Link>
            <Link to="/terms" className="transition-colors duration-hover ease-brand hover:text-ink-600">
              Terms of Service
            </Link>
            <a
              href="mailto:mouhanned.j18@gmail.com"
              className="transition-colors duration-hover ease-brand hover:text-ink-600"
            >
              mouhanned.j18@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface LegalSectionProps {
  number: number;
  title: string;
  children: ReactNode;
}

export function LegalSection({ number, title, children }: LegalSectionProps) {
  return (
    <section id={slugify(title)}>
      <h2 className="font-display text-xl font-semibold text-ink-900">
        <span className="mr-2 text-brass-700">{number}.</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-600">{children}</div>
    </section>
  );
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
