import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useActionToastStore } from '@/store/actionToast';
import type { ActionToastVariant } from '@/store/actionToast';
import { motionTransition, springs } from '@/lib/motion/springs';

// Mirrors NotificationToast.tsx's gesture behavior/positioning so the two
// stacks (real-time notifications vs. this action-feedback stack) read as
// one system, just colored by outcome instead of notification type.
const DISMISS_DISTANCE = 80;
const DISMISS_VELOCITY = 500;

const VARIANT_ICON: Record<ActionToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const VARIANT_CLASSES: Record<ActionToastVariant, string> = {
  success: 'bg-moss-100 text-moss-600',
  error: 'bg-terracotta-100 text-terracotta-600',
  warning: 'bg-ochre-100 text-ochre-600',
  info: 'bg-steel-100 text-steel-600',
};

export function ActionToast() {
  const toasts = useActionToastStore((s) => s.toasts);
  const dismiss = useActionToastStore((s) => s.dismiss);
  const reduce = !!useReducedMotion();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
      <AnimatePresence>
        {toasts.map(({ id, variant, title, description }) => {
          const Icon = VARIANT_ICON[variant];
          return (
            <motion.div
              key={id}
              layout
              drag={reduce ? false : 'x'}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={(_e, info) => {
                if (Math.abs(info.offset.x) > DISMISS_DISTANCE || Math.abs(info.velocity.x) > DISMISS_VELOCITY) {
                  dismiss(id);
                }
              }}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, x: 80 }}
              transition={motionTransition(reduce, springs.snappy)}
              className="pointer-events-auto flex cursor-grab items-start gap-3 rounded-md border border-ink-200 bg-bone-50 p-3 shadow-lg active:cursor-grabbing"
            >
              <span className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm ${VARIANT_CLASSES[variant]}`}>
                <Icon size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{title}</p>
                {description && <p className="truncate text-xs text-ink-500">{description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(id)}
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm text-ink-400 transition-colors duration-hover ease-brand hover:bg-ink-100 hover:text-ink-700"
                title="Dismiss"
              >
                <X size={13} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
