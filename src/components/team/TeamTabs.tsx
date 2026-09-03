import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { motionTransition, springs } from '@/lib/motion/springs';

const TABS = [
  { to: '/team', label: 'People' },
  { to: '/team/onboarding', label: 'Onboarding' },
];

/**
 * Routes rather than local state, so a link straight to the builder works and the browser's
 * back button behaves. The active underline is a shared `layoutId`, which is what makes it
 * slide between tabs instead of cutting.
 */
export function TeamTabs() {
  const { pathname } = useLocation();
  const reduce = !!useReducedMotion();

  return (
    <div className="flex gap-1 border-b border-ink-200">
      {TABS.map((tab) => {
        const active = pathname === tab.to;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            data-tour-id={tab.to === '/team/onboarding' ? 'team.onboardingTab' : undefined}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors duration-hover ease-brand focus-ring',
              active ? 'text-ink-900' : 'text-ink-400 hover:text-ink-700',
            )}
          >
            {tab.label}
            {active && (
              <motion.span
                layoutId="team-tab-underline"
                className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brass-500"
                transition={motionTransition(reduce, springs.snappy)}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
