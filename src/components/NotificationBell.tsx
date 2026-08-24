import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import type { AppNotification } from '@/lib/types';
import { cn } from '@/lib/utils';
import { NOTIFICATION_TYPE_ICON } from '@/lib/notifications';

export function NotificationBell({ variant = 'default' }: { variant?: 'default' | 'panel' }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const isPanel = variant === 'panel';

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<AppNotification[]>('/notifications').then((res) => res.data),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteNotification = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const handleSelect = (notification: AppNotification) => {
    if (!notification.readAt) markRead.mutate(notification.id);
    if (isPanel) return; // Panel is a small frameless window — there's nowhere to navigate to.
    setOpen(false);
    navigate(notification.link);
  };

  const handleDelete = (e: ReactMouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification.mutate(id);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative flex items-center justify-center rounded-sm transition-all duration-hover ease-brand',
          isPanel
            ? 'h-7 w-7 text-ink-400 hover:bg-ink-800 hover:text-bone-100 active:scale-95 active:duration-press'
            : 'h-9 w-9 text-ink-500 hover:bg-ink-100 hover:text-ink-800'
        )}
        title="Notifications"
      >
        <Bell size={isPanel ? 14 : 18} />
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute flex items-center justify-center rounded-full bg-terracotta-500 font-semibold leading-none text-bone-50',
              isPanel ? 'right-0 top-0 h-3.5 min-w-3.5 px-0.5 text-[8px]' : 'right-1 top-1 h-4 min-w-4 px-1 text-[10px]'
            )}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 z-50 animate-fade-up rounded-md border border-ink-200 bg-bone-50 shadow-lg',
            isPanel ? 'top-8 w-72 max-w-[calc(100vw-1.5rem)]' : 'top-11 w-80'
          )}
        >
          <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
            <p className="text-sm font-medium text-ink-900">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-xs font-medium text-brass-700 transition-colors duration-hover ease-brand hover:text-brass-800"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>
          <div className={cn('overflow-y-auto', isPanel ? 'max-h-72' : 'max-h-96')}>
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-ink-400">
                <Bell className="mx-auto mb-2 h-6 w-6 text-ink-300" />
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleSelect(n)}
                  className={cn(
                    'group flex w-full items-start gap-3 border-b border-ink-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-ink-50',
                    !n.readAt && 'bg-brass-50/60'
                  )}
                >
                  <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm bg-ink-100 text-ink-500">
                    {NOTIFICATION_TYPE_ICON[n.type]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-ink-900">{n.title}</p>
                      {!n.readAt && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brass-500" />}
                    </div>
                    <p className="truncate text-xs text-ink-500">{n.body}</p>
                    <p className="mt-0.5 text-[11px] text-ink-400">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <span
                    role="button"
                    title="Delete"
                    onClick={(e) => handleDelete(e, n.id)}
                    className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm text-ink-300 opacity-0 transition-all duration-hover ease-brand hover:bg-terracotta-100 hover:text-terracotta-600 group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </span>
                </button>
              ))
            )}
          </div>
          {!isPanel && (
            <Link
              to="/inbox"
              onClick={() => setOpen(false)}
              className="block border-t border-ink-200 px-4 py-2.5 text-center text-xs font-medium text-brass-700 transition-colors duration-hover ease-brand hover:text-brass-800"
            >
              View all
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
