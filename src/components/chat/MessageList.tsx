import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { MessageRow, type MessageRowActions } from './MessageRow';
import type { ChatAttachment, TeamChannelMessage, TeamMemberType } from '@/lib/types';
import { format, isSameDay, isToday, isYesterday } from 'date-fns';
import { ArrowDown, Loader2 } from 'lucide-react';

/** Messages from one sender inside this window collapse into a single visual block. */
const GROUPING_WINDOW_MS = 5 * 60 * 1000;
/** How close to the bottom still counts as "following along". */
const NEAR_BOTTOM_PX = 120;

function dayLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}

function DayDivider({ date }: { date: Date }) {
  return (
    <div className="relative my-3 flex items-center px-5">
      <div className="h-px flex-1 bg-ink-200" />
      <span className="mx-3 rounded-full border border-ink-200 bg-surface px-3 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-500">
        {dayLabel(date)}
      </span>
      <div className="h-px flex-1 bg-ink-200" />
    </div>
  );
}

function UnreadDivider() {
  return (
    <div className="relative my-2 flex items-center px-5" aria-label="New messages">
      <div className="h-px flex-1 bg-brass-400" />
      <span className="ml-3 text-[10px] font-semibold uppercase tracking-wide text-brass-600">New</span>
    </div>
  );
}

export function MessageList({
  messages,
  myType,
  myId,
  canModerate,
  apiBase,
  mentionNames,
  selfName,
  actions,
  firstUnreadMessageId,
  hasMore,
  isFetchingMore,
  onLoadMore,
  highlightMessageId,
  emptyState,
}: {
  messages: TeamChannelMessage[];
  myType: TeamMemberType;
  myId: string;
  canModerate: boolean;
  apiBase: string;
  mentionNames: string[];
  selfName?: string;
  actions: MessageRowActions;
  firstUnreadMessageId?: string | null;
  hasMore?: boolean;
  isFetchingMore?: boolean;
  onLoadMore?: () => void;
  highlightMessageId?: string | null;
  emptyState?: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const lastCountRef = useRef(messages.length);
  const restoreRef = useRef<{ height: number; top: number } | null>(null);

  /** Pinned to the divider it had on entry, so it doesn't slide away as you read. */
  const [stickyUnreadId] = useState(firstUnreadMessageId ?? null);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(distance < NEAR_BOTTOM_PX);

    if (el.scrollTop < 80 && hasMore && !isFetchingMore && onLoadMore) {
      // Remember where we are so the older page can be prepended without the viewport
      // jumping to the top.
      restoreRef.current = { height: el.scrollHeight, top: el.scrollTop };
      onLoadMore();
    }
  }, [hasMore, isFetchingMore, onLoadMore]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    const restore = restoreRef.current;
    if (el && restore) {
      // Anchor scroll position against the height the prepended page just added.
      el.scrollTop = el.scrollHeight - restore.height + restore.top;
      restoreRef.current = null;
      lastCountRef.current = messages.length;
      return;
    }

    const grew = messages.length > lastCountRef.current;
    lastCountRef.current = messages.length;
    // Only follow new messages if the reader was already at the bottom — yanking someone
    // out of history they are reading is the worst thing a chat list can do.
    if (grew && atBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length, atBottom]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
    // Jump to the bottom once on mount, without animating through the whole history.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Every image in the conversation, so the lightbox can page across messages. */
  const galleryImages: ChatAttachment[] = messages.flatMap(
    (m) => m.attachments?.filter((a) => a.fileType === 'image') ?? [],
  );

  if (!messages.length) {
    return (
      <div className="flex flex-1 items-center justify-center bg-bone-50">
        {emptyState ?? <p className="text-sm text-ink-400">No messages yet. Say hello.</p>}
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden bg-bone-50">
      <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto py-2">
        {isFetchingMore && (
          <div className="flex justify-center py-3">
            <Loader2 size={16} className="animate-spin text-ink-300" />
          </div>
        )}

        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const createdAt = new Date(message.createdAt);
          const showDay = !previous || !isSameDay(new Date(previous.createdAt), createdAt);
          const showUnread = stickyUnreadId === message.id;

          const grouped =
            !!previous &&
            !showDay &&
            !showUnread &&
            !previous.isDeleted &&
            previous.senderType === message.senderType &&
            previous.senderId === message.senderId &&
            createdAt.getTime() - new Date(previous.createdAt).getTime() < GROUPING_WINDOW_MS;

          return (
            <div key={message.id}>
              {showDay && <DayDivider date={createdAt} />}
              {showUnread && <UnreadDivider />}
              <MessageRow
                message={message}
                grouped={grouped}
                isMine={message.senderType === myType && message.senderId === myId}
                myType={myType}
                myId={myId}
                canModerate={canModerate}
                apiBase={apiBase}
                mentionNames={mentionNames}
                selfName={selfName}
                galleryImages={galleryImages}
                actions={actions}
                isUnreadAnchor={showUnread}
                highlighted={highlightMessageId === message.id}
              />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {!atBottom && (
        <button
          type="button"
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })}
          className={cn(
            'absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full',
            'border border-ink-200 bg-surface px-3 py-1.5 text-xs font-medium text-ink-700 shadow-sm',
            'transition-colors duration-hover ease-brand hover:bg-ink-50',
          )}
        >
          <ArrowDown size={13} />
          Jump to latest
        </button>
      )}
    </div>
  );
}
