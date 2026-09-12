import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { PresenceBadge, PresenceDot } from '@/components/ui/PresenceDot';
import { usePresenceStore, presenceStateOf } from '@/store/presence';
import type { ChannelMemberEntry, PresenceEntry, TeamChannelMessage, TeamChannelSummary } from '@/lib/types';
import { format } from 'date-fns';
import { Hash, Lock, Briefcase, Pin, Users, ChevronDown, Archive } from 'lucide-react';

function TypingLine({ names }: { names: string[] }) {
  if (!names.length) return null;
  const text =
    names.length === 1
      ? `${names[0]} is typing…`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing…`
        : `${names[0]} and ${names.length - 1} others are typing…`;
  return <p className="text-[11px] text-brass-600">{text}</p>;
}

/** The pinned strip. Collapsed to a count until opened — a channel with twenty pins would
 *  otherwise push the conversation off screen. */
function PinnedBar({
  pinned,
  onJump,
}: {
  pinned: TeamChannelMessage[];
  onJump: (messageId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!pinned.length) return null;

  return (
    <div className="border-b border-ink-200 bg-brass-50/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-5 py-1.5 text-left text-xs text-brass-800 transition-colors duration-hover ease-brand hover:bg-brass-50"
      >
        <Pin size={12} />
        <span className="font-medium">
          {pinned.length} pinned {pinned.length === 1 ? 'message' : 'messages'}
        </span>
        <ChevronDown size={12} className={cn('ml-auto transition-transform duration-hover ease-brand', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="max-h-44 space-y-1 overflow-y-auto px-5 pb-2">
          {pinned.map((message) => (
            <button
              key={message.id}
              type="button"
              onClick={() => onJump(message.id)}
              className="block w-full rounded-sm border border-brass-200 bg-surface px-3 py-1.5 text-left transition-colors duration-hover ease-brand hover:border-brass-300"
            >
              <p className="text-[11px] font-medium text-ink-700">
                {message.senderName} · {format(new Date(message.createdAt), 'MMM d')}
              </p>
              <p className="truncate text-xs text-ink-600">{message.body || 'Attachment'}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChannelHeader({
  channel,
  apiBase,
  typingNames,
  pinned,
  onJumpToMessage,
  onOpenDetails,
}: {
  channel: TeamChannelSummary;
  apiBase: string;
  typingNames: string[];
  pinned: TeamChannelMessage[];
  onJumpToMessage: (messageId: string) => void;
  onOpenDetails?: () => void;
}) {
  const counterpart = channel.counterpart;
  const presence = usePresenceStore((s) =>
    counterpart ? s.entries[`${counterpart.type}:${counterpart.id}`] : undefined,
  ) as PresenceEntry | undefined;

  const { data: members = [] } = useQuery({
    queryKey: ['team-chat-members-of', apiBase, channel.id],
    queryFn: () =>
      api.get<ChannelMemberEntry[]>(`${apiBase}/channels/${channel.id}/members`).then((res) => res.data),
    enabled: channel.type !== 'dm',
    staleTime: 60_000,
  });

  const Icon = channel.type === 'project' ? Briefcase : channel.isPrivate ? Lock : Hash;

  return (
    <div className="flex-shrink-0">
      <div className="flex items-center justify-between gap-3 border-b border-ink-200 bg-ink-50/50 px-5 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          {channel.type === 'dm' ? (
            <PresenceBadge state={presenceStateOf(presence)} size="sm">
              <Avatar name={channel.name} className="h-9 w-9" />
            </PresenceBadge>
          ) : (
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-500">
              <Icon size={16} />
            </span>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium leading-tight text-ink-900">
                {channel.type === 'channel' ? `# ${channel.name}` : channel.name}
              </p>
              {channel.archivedAt && (
                <span className="flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-500">
                  <Archive size={9} />
                  Archived
                </span>
              )}
            </div>

            {typingNames.length > 0 ? (
              <TypingLine names={typingNames} />
            ) : channel.type === 'dm' && presence?.focusMode ? (
              <p className="flex items-center gap-1.5 text-[11px] text-brass-700">
                <PresenceDot state="focus" size="sm" />
                In focus mode
                {presence.focusUntil && ` until ${format(new Date(presence.focusUntil), 'h:mm a')}`}
                {presence.focusMessage && <span className="italic">· {presence.focusMessage}</span>}
              </p>
            ) : channel.topic ? (
              <p className="truncate text-[11px] text-ink-500">{channel.topic}</p>
            ) : null}
          </div>
        </div>

        {channel.type !== 'dm' && (
          <button
            type="button"
            onClick={onOpenDetails}
            disabled={!onOpenDetails}
            className={cn(
              'flex flex-shrink-0 items-center gap-1.5 rounded-sm border border-ink-200 px-2 py-1 text-xs text-ink-600',
              onOpenDetails && 'transition-colors duration-hover ease-brand hover:bg-ink-100',
            )}
            aria-label="Channel members"
          >
            <span className="flex -space-x-1.5">
              {members.slice(0, 3).map((member) => (
                <Avatar key={`${member.type}:${member.id}`} name={member.name} className="h-5 w-5 ring-1 ring-bone-50" />
              ))}
            </span>
            {members.length > 0 ? (
              <span className="tabular-nums">{members.length}</span>
            ) : (
              <Users size={13} />
            )}
          </button>
        )}
      </div>

      <PinnedBar pinned={pinned} onJump={onJumpToMessage} />
    </div>
  );
}
