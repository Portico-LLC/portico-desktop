import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { useNotificationToastStore } from '@/store/notificationToast';
import { NOTIFICATION_TYPE_ICON } from '@/lib/notifications';
import { motionTransition, springs } from '@/lib/motion/springs';

// Past this drag distance (or a fast enough flick), a released toast dismisses
// instead of springing back — mirrors the guidance's boundary/gesture rules.
const DISMISS_DISTANCE = 80;
const DISMISS_VELOCITY = 500;

export function NotificationToast() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toasts = useNotificationToastStore((s) => s.toasts);
  const dismiss = useNotificationToastStore((s) => s.dismiss);
  const reduce = !!useReducedMotion();

  if (toasts.length === 0) return null;

  const handleSelect = (id: string, notificationId: string, link: string) => {
    dismiss(id);
    api.patch(`/notifications/${notificationId}/read`).then(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
    navigate(link);
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
      <AnimatePresence>
        {toasts.map(({ id, notification }) => (
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
            <button
              type="button"
              onClick={() => handleSelect(id, notification.id, notification.link)}
              className="flex min-w-0 flex-1 items-start gap-3 text-left"
            >
              <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm bg-ink-100 text-ink-500">
                {NOTIFICATION_TYPE_ICON[notification.type]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{notification.title}</p>
                <p className="truncate text-xs text-ink-500">{notification.body}</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => dismiss(id)}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm text-ink-400 transition-colors duration-hover ease-brand hover:bg-ink-100 hover:text-ink-700"
              title="Dismiss"
            >
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
