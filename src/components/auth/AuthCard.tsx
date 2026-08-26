import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AuthCardProps {
  logo?: ReactNode;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function AuthCard({ logo, eyebrow, title, subtitle, children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        'animate-fade-up relative overflow-hidden rounded-lg border border-ink-200 bg-bone-100 p-7 shadow-lg',
        className
      )}
    >
      {/* Brass keyline — the same "subtle brass keyline" identity mark called for in DESIGN.md's
          wordmark spec, carried onto the card that greets a returning studio owner. */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-brass-500" />

      {logo && <div className="mb-5 flex justify-center">{logo}</div>}
      <div className="text-center">
        {eyebrow && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-600">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em] text-ink-900">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-ink-500">{subtitle}</p>}
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
