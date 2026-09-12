import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { PresenceBadge } from '@/components/ui/PresenceDot';
import { usePresenceStore, presenceStateOf } from '@/store/presence';
import type { TeamChannelSummary } from '@/lib/types';
import { format, isToday } from 'date-fns';
import { Search, Hash, Briefcase, MessageSquare, ChevronRight, Lock, Plus } from 'lucide-react';

function ChannelRow({
  channel,
  active,
  onSelect,
}: {
  channel: TeamChannelSummary;
  active: boolean;
  onSelect: () => void;
}) {
  const counterpart = channel.counterpart;
  const presence = usePresenceStore((s) =>
    counterpart ? s.entries[`${counterpart.type}:${counterpart.id}`] : undefined,
  );
  const unread = channel.unreadCount > 0;

  return (
    <button
      onClick={onSelect}
      className={cn(
        'group relative w-full px-4 py-2 text-left transition-colors duration-hover ease-brand',
        // The brass keyline is the active marker — signal colour, used sparingly.
        'before:absolute before:left-0 before:top-1/2 before:h-6 before:w-0.5 before:-translate-y-1/2',
        'before:rounded-full before:bg-brass-500 before:transition-opacity before:duration-hover before:ease-brand',
        active ? 'bg-bone-50 before:opacity-100' : 'before:opacity-0 hover:bg-ink-100/70 hover:before:opacity-40',
      )}
    >
      <div className="flex items-start gap-2.5">
        {channel.type === 'dm' ? (
          <PresenceBadge state={presenceStateOf(presence)} size="sm">
            <Avatar name={channel.name} className="h-8 w-8" />
          </PresenceBadge>
        ) : (
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-500">
            {channel.type === 'project' ? <Briefcase size={14} /> : channel.isPrivate ? <Lock size={13} /> : <Hash size={14} />}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={cn('truncate text-sm text-ink-900', unread ? 'font-semibold' : 'font-medium')}>
              {channel.type === 'channel' ? `# ${channel.name}` : channel.name}
            </p>
            {channel.lastMessage && (
              <span className="flex-shrink-0 text-[11px] text-ink-400 tabular-nums">
                {isToday(new Date(channel.lastMessage.createdAt))
                  ? format(new Date(channel.lastMessage.createdAt), 'h:mm a')
                  : format(new Date(channel.lastMessage.createdAt), 'MMM d')}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p className={cn('truncate text-xs', unread ? 'text-ink-700' : 'text-ink-500')}>
              {channel.lastMessage
                ? `${channel.lastMessage.senderName}: ${channel.lastMessage.body}`
                : 'No messages yet'}
            </p>
            {unread && (
              <span className="flex h-4 min-w-4 flex-shrink-0 items-center justify-center rounded-full bg-brass-500 px-1 text-[10px] font-semibold text-bone-50 tabular-nums">
                {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function Section({
  label,
  icon,
  channels,
  selectedId,
  onSelect,
  action,
}: {
  label: string;
  icon: React.ReactNode;
  channels: TeamChannelSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  action?: { label: string; onClick: () => void };
}) {
  const [collapsed, setCollapsed] = useState(false);
  if (channels.length === 0 && !action) return null;

  const unreadTotal = channels.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="pb-1">
      <div className="flex items-center gap-1 px-3 pb-1 pt-3">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-sm px-1 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-400 transition-colors duration-hover ease-brand hover:text-ink-600"
          aria-expanded={!collapsed}
        >
          <ChevronRight
            size={11}
            className={cn('transition-transform duration-hover ease-brand', !collapsed && 'rotate-90')}
          />
          {icon}
          <span className="truncate">{label}</span>
          {/* Collapsing a section must not hide the fact that something in it is unread. */}
          {collapsed && unreadTotal > 0 && (
            <span className="ml-1 rounded-full bg-brass-500 px-1.5 text-[10px] font-semibold text-bone-50 tabular-nums">
              {unreadTotal}
            </span>
          )}
        </button>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            aria-label={action.label}
            title={action.label}
            className="rounded-sm p-1 text-ink-400 transition-colors duration-hover ease-brand hover:bg-ink-100 hover:text-ink-700"
          >
            <Plus size={13} />
          </button>
        )}
      </div>
      {!collapsed &&
        channels.map((channel) => (
          <ChannelRow
            key={channel.id}
            channel={channel}
            active={channel.id === selectedId}
            onSelect={() => onSelect(channel.id)}
          />
        ))}
    </div>
  );
}

export function ChannelRail({
  channels,
  loading,
  selectedId,
  onSelect,
  onBrowseChannels,
  onNewDm,
  footer,
}: {
  channels: TeamChannelSummary[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBrowseChannels?: () => void;
  onNewDm?: () => void;
  footer?: React.ReactNode;
}) {
  const [search, setSearch] = useState('');
  const filtered = channels.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex w-72 flex-shrink-0 flex-col border-r border-ink-200 bg-ink-50/50">
      <div className="border-b border-ink-200 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-ink-400" />
          <Input
            placeholder="Search conversations..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
            <Section
              label="Project chats"
              icon={<Briefcase size={11} />}
              channels={filtered.filter((c) => c.type === 'project')}
              selectedId={selectedId}
              onSelect={onSelect}
            />
            <Section
              label="Channels"
              icon={<Hash size={11} />}
              channels={filtered.filter((c) => c.type === 'channel')}
              selectedId={selectedId}
              onSelect={onSelect}
              action={onBrowseChannels ? { label: 'Browse or create channels', onClick: onBrowseChannels } : undefined}
            />
            <Section
              label="Direct messages"
              icon={<MessageSquare size={11} />}
              channels={filtered.filter((c) => c.type === 'dm')}
              selectedId={selectedId}
              onSelect={onSelect}
              action={onNewDm ? { label: 'Start a direct message', onClick: onNewDm } : undefined}
            />
            {filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-ink-400">
                <MessageSquare className="mx-auto mb-2 h-6 w-6 text-ink-300" />
                {search ? 'Nothing matches that search.' : 'No conversations yet.'}
              </div>
            )}
          </>
        )}
      </div>

      {footer && <div className="border-t border-ink-200 p-3">{footer}</div>}
    </div>
  );
}
