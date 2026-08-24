import { Link } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';

export function LandingFooter() {
  return (
    <footer className="border-t border-ink-200 bg-bone-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <Logo tone="ink" markSize={28} />
          <div className="flex flex-wrap gap-6 text-sm">
            <a
              href="#features"
              className="text-ink-500 transition-colors duration-hover ease-brand hover:text-ink-900"
            >
              Features
            </a>
            <a
              href="#security"
              className="text-ink-500 transition-colors duration-hover ease-brand hover:text-ink-900"
            >
              Security
            </a>
            <a
              href="#ai"
              className="text-ink-500 transition-colors duration-hover ease-brand hover:text-ink-900"
            >
              AI
            </a>
            <Link to="/privacy" className="text-ink-500 transition-colors duration-hover ease-brand hover:text-ink-900">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-ink-500 transition-colors duration-hover ease-brand hover:text-ink-900">
              Terms of Service
            </Link>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-ink-100 pt-6 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Portico. All rights reserved.</p>
          <p>
            Built by{' '}
            <a
              href="mailto:mouhanned.j18@gmail.com"
              className="font-medium text-ink-600 transition-colors duration-hover ease-brand hover:text-brass-700"
            >
              Mouhanned Jawadi
            </a>{' '}
            ·{' '}
            <a
              href="mailto:mouhanned.j18@gmail.com"
              className="transition-colors duration-hover ease-brand hover:text-ink-600"
            >
              mouhanned.j18@gmail.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
