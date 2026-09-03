import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, RotateCcw, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EASE_BRAND } from '@/components/brand/ArchMotif';
import { motionTransition, springs } from '@/lib/motion/springs';
import { ONBOARDING_QUERY_KEY, dismissChecklist, fetchBootstrap } from '@/lib/onboarding/api';
import { useAuthStore } from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';
import type { ChecklistItem } from '@/lib/onboarding/types';

/** The check, drawn rather than faded in. A stroke that draws itself reads as *the act of*
 *  ticking something off, where an opacity fade reads as the row simply changing state. */
function TickMark({ done, reduce }: { done: boolean; reduce: boolean }) {
  return (
    <span
      className={
        'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition-colors duration-transition ease-brand ' +
        (done ? 'border-moss-500 bg-moss-500' : 'border-ink-300')
      }
    >
      {done && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
          <motion.path
            d="M2 5.2L4 7.2L8 3"
            stroke="var(--bone-50)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduce ? 0 : 0.26, ease: EASE_BRAND }}
          />
        </svg>
      )}
    </span>
  );
}

/**
 * The owner's first-week list, on the Dashboard.
 *
 * Every item is derived server-side from real rows rather than stored as a tick, so it cannot
 * claim you have done something you have since undone. That also means there is nothing to
 * click here — the list ticks itself as the work actually happens, and each outstanding row is
 * simply a link to the place where it would.
 */
export function SetupChecklist() {
  const role = useAuthStore((s) => s.role);
  const reduce = !!useReducedMotion();
  const queryClient = useQueryClient();
  const requestReplay = useOnboardingStore((s) => s.requestReplay);

  const { data } = useQuery({
    queryKey: ONBOARDING_QUERY_KEY,
    queryFn: () => fetchBootstrap(role),
    staleTime: 30_000,
  });

  const dismiss = useMutation({
    mutationFn: () => dismissChecklist(true),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY }),
    meta: { successMessage: 'Checklist hidden', errorTitle: 'Could not hide the checklist' },
  });

  const checklist = data?.checklist;
  if (!checklist?.applicable || checklist.dismissed || checklist.total === 0) return null;

  const { items, completed, total } = checklist;
  const allDone = completed === total;

  return (
    <Card
      data-tour-id="dashboard.checklist"
      // `hover:translate-y-0` cancels Card's built-in lift — DESIGN.md 6.2 reserves that for
      // cards that are themselves a link or button, and this one is a container.
      className="overflow-hidden hover:translate-y-0 hover:shadow-xs"
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">
            Get set up
          </p>
          <h3 className="mt-1 font-display text-[20px] leading-tight text-ink-900">
            {allDone ? 'You are set up' : 'Your first week'}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium tabular-nums text-ink-400">
            {completed} / {total}
          </span>
          <button
            type="button"
            onClick={() => dismiss.mutate()}
            className="rounded-sm p-1 text-ink-400 transition-colors duration-hover ease-brand hover:bg-ink-100 hover:text-ink-700 focus-ring"
            aria-label="Hide checklist"
            title="Hide checklist"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="mt-4 px-6">
        <div className="h-1 overflow-hidden rounded-full bg-ink-200">
          <motion.div
            className="h-full rounded-full bg-brass-500"
            initial={false}
            animate={{ width: `${(completed / total) * 100}%` }}
            transition={motionTransition(reduce, springs.reposition)}
          />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {allDone ? (
          <motion.p
            key="done"
            className="px-6 py-5 text-sm text-ink-500"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={motionTransition(reduce, springs.snappy)}
          >
            That is the whole list. Close this card whenever you like.
          </motion.p>
        ) : (
          <motion.ul
            key="list"
            className="px-3 py-2"
            initial={false}
            animate={{ opacity: 1 }}
          >
            {items.map((item) => (
              <ChecklistRow key={item.id} item={item} reduce={reduce} />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <div className="border-t border-ink-200 px-6 py-3">
        <button
          type="button"
          onClick={() => requestReplay()}
          className="inline-flex items-center gap-2 rounded-sm text-xs font-medium text-ink-400 transition-colors duration-hover ease-brand hover:text-ink-700 focus-ring"
        >
          <RotateCcw size={13} />
          Replay the walkthrough
        </button>
      </div>
    </Card>
  );
}

function ChecklistRow({ item, reduce }: { item: ChecklistItem; reduce: boolean }) {
  const content = (
    <>
      <TickMark done={item.done} reduce={reduce} />
      <span className={item.done ? 'flex-1 text-ink-400 line-through' : 'flex-1 text-ink-700'}>
        {item.label}
      </span>
      {!item.done && (
        <ChevronRight
          size={14}
          className="text-ink-300 transition-transform duration-hover ease-brand group-hover:translate-x-0.5 group-hover:text-ink-500"
        />
      )}
    </>
  );

  const className =
    'group flex h-9 items-center gap-3 rounded-sm px-3 text-sm transition-colors duration-hover ease-brand';

  // A completed row is a statement of fact, not a destination — linking it would send someone
  // to a page to do something they have already done.
  return (
    <li>
      {item.done ? (
        <div className={className}>{content}</div>
      ) : (
        <Link to={item.route} className={`${className} hover:bg-ink-50 focus-ring`}>
          {content}
        </Link>
      )}
    </li>
  );
}
