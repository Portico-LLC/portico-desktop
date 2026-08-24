import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { isElectron } from '@/lib/isElectron';

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#security', label: 'Security' },
  { href: '#ai', label: 'AI' },
  // The Download section is not rendered inside the desktop app, so the anchor
  // that jumps to it must not be either — it would scroll to nothing.
  ...(isElectron ? [] : [{ href: '#download', label: 'Download' }]),
  { href: '#contact', label: 'Contact' },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b bg-bone-50/90 backdrop-blur transition-shadow duration-hover ease-brand',
        scrolled ? 'border-ink-200 shadow-sm' : 'border-transparent'
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo tone="ink" markSize={32} />

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative text-sm font-medium text-ink-600 transition-colors duration-hover ease-brand hover:text-ink-900"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-brass-600 transition-all duration-hover ease-brand group-hover:w-full" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-medium text-ink-600 transition-colors duration-hover ease-brand hover:text-ink-900"
          >
            Sign in
          </Link>
          <Link to="/signup">
            <Button variant="primary" size="sm" className="transition-transform duration-hover ease-brand hover:-translate-y-0.5">
              Get Started
            </Button>
          </Link>
        </div>
      </div>

      {/* How far through the page you are, as a hairline. */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px origin-left bg-brass-500"
        style={{ scaleX: scrollYProgress }}
      />
    </header>
  );
}
