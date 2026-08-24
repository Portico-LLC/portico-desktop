import { formatDistanceToNow } from 'date-fns';
import { Activity as ActivityIconGlyph } from 'lucide-react';
import type { ActivityEvent } from '@/lib/types';
import { ActivityIcon } from './ActivityIcon';

interface ActivityFeedProps {
  events: ActivityEvent[];
  isLoading: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

export function ActivityFeed({ events, isLoading, hasNextPage, isFetchingNextPage, onLoadMore }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-ink-200 bg-bone-50 p-8 text-center text-sm text-ink-400 shadow-xs">
        Loading activity…
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="rounded-lg border border-ink-200 bg-bone-50 p-8 text-center text-sm text-ink-400 shadow-xs">
        <ActivityIconGlyph className="mx-auto mb-2 h-6 w-6 text-ink-300" />
        Nothing here yet — activity shows up automatically as work happens.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-ink-200 bg-bone-50 shadow-xs">
      {events.map((event) => (
        <div key={event.id} className="flex items-start gap-3 border-b border-ink-100 px-4 py-3 last:border-0">
          <ActivityIcon type={event.type} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink-900">{event.summary}</p>
            <p className="mt-0.5 text-[11px] text-ink-400">
              {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
      {hasNextPage && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
          className="w-full border-t border-ink-100 py-3 text-center text-sm font-medium text-brass-700 transition-colors duration-hover ease-brand hover:text-brass-800 disabled:opacity-50"
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
