import { useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, MessageSquare, Hash, CheckSquare, AtSign, CheckCheck, AlertCircle, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api, getErrorMessage } from '@/lib/api';
import type { AppNotification, NotificationPage, NotificationType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  team_message: <Hash size={14} />,
  client_message: <MessageSquare size={14} />,
  task_assigned: <CheckSquare size={14} />,
  mention: <AtSign size={14} />,
};

type FilterTab = 'all' | 'unread' | 'mentions';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'mentions', label: 'Mentions' },
];

export function Inbox() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<FilterTab>('all');

  const queryKey = ['notifications', 'inbox', tab] as const;

  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      api
        .get<NotificationPage>('/notifications', {
          params: {
            cursor: pageParam ?? undefined,
            limit: 30,
            unreadOnly: tab === 'unread' ? true : undefined,
            type: tab === 'mentions' ? 'mention' : undefined,
          },
        })
        .then((res) => res.data),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
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

  const notifications = data?.pages.flatMap((p) => p.notifications) ?? [];
  const hasUnread = notifications.some((n) => !n.readAt);

  const handleSelect = (notification: AppNotification) => {
    if (!notification.readAt) markRead.mutate(notification.id);
    navigate(notification.link);
  };

  const handleDelete = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification.mutate(id);
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-4xl font-display font-semibold text-ink-900">Inbox</h1>
          <p className="text-ink-500">Everything that needs your attention — mentions, assignments, and messages.</p>
        </div>
        {hasUnread && (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            className="flex items-center gap-1.5 text-sm font-medium text-brass-700 transition-colors duration-hover ease-brand hover:text-brass-800"
          >
            <CheckCheck size={15} />
            Mark all read
          </button>
        )}
      </div>

      <div className="mb-6 grid w-fit grid-cols-3 gap-1 rounded-md border border-ink-200 bg-ink-100 p-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'rounded-sm px-4 py-1.5 text-sm font-medium transition-all duration-hover ease-brand',
              tab === key ? 'bg-bone-100 text-ink-900 shadow-xs' : 'text-ink-500 hover:text-ink-800'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-ink-200 bg-bone-50 p-8 text-center text-sm text-ink-400 shadow-xs">
          Loading…
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-terracotta-500/30 bg-terracotta-100/60 p-8 text-center text-sm text-terracotta-700 shadow-xs">
          <AlertCircle className="mx-auto mb-2 h-6 w-6 text-terracotta-500" />
          <p className="mb-3">Couldn't load your inbox — {getErrorMessage(error)}</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-lg border border-ink-200 bg-bone-50 p-8 text-center text-sm text-ink-400 shadow-xs">
          <Bell className="mx-auto mb-2 h-6 w-6 text-ink-300" />
          {tab === 'unread' ? "You're all caught up." : tab === 'mentions' ? 'No mentions yet.' : 'Nothing here yet.'}
        </div>
      ) : (
        <div className="rounded-lg border border-ink-200 bg-bone-50 shadow-xs">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleSelect(n)}
              className={cn(
                'group flex w-full items-start gap-3 border-b border-ink-100 px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-ink-50',
                !n.readAt && 'bg-brass-50/60'
              )}
            >
              <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm bg-ink-100 text-ink-500">
                {TYPE_ICON[n.type]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-ink-900">{n.title}</p>
                  {!n.readAt && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brass-500" />}
                </div>
                <p className="truncate text-sm text-ink-500">{n.body}</p>
                <p className="mt-0.5 text-[11px] text-ink-400">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </div>
              <span
                role="button"
                title="Delete"
                onClick={(e) => handleDelete(e, n.id)}
                className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm text-ink-300 opacity-0 transition-all duration-hover ease-brand hover:bg-terracotta-100 hover:text-terracotta-600 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </span>
            </button>
          ))}
          {hasNextPage && (
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full border-t border-ink-100 py-3 text-center text-sm font-medium text-brass-700 transition-colors duration-hover ease-brand hover:text-brass-800 disabled:opacity-50"
            >
              {isFetchingNextPage ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
