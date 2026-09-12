import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getTeamChatSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth';
import type { TeamChannelSummary, TeamChannelMessage } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { PanelListRow, PanelEmptyState, PanelSkeletonList } from '@/components/panel/PanelListPrimitives';
import { PresenceBadge } from '@/components/ui/PresenceDot';
import { usePresenceStore, presenceStateOf } from '@/store/presence';
import { Send, ChevronLeft, MessageSquare, Paperclip } from 'lucide-react';
import { format } from 'date-fns';

const THREAD_LIMIT = 15;

export function MessagesTab() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.role);
  const currentUser = useAuthStore((s) => s.user);
  const isClient = role === 'client';
  const mineType = role === 'employee' ? 'employee' : role === 'client' ? 'client' : 'owner';
  const apiBase = isClient ? '/client/team-chat' : '/team-chat';

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['team-chat-channels', apiBase],
    queryFn: () => api.get<TeamChannelSummary[]>(`${apiBase}/channels`).then((res) => res.data),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['team-chat-messages', selectedId],
    queryFn: () => api.get<TeamChannelMessage[]>(`${apiBase}/channels/${selectedId}/messages`).then((res) => res.data),
    enabled: !!selectedId,
  });

  const markRead = useMutation({
    mutationFn: (channelId: string) => api.patch(`${apiBase}/channels/${channelId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-chat-channels'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const sendMessage = useMutation({
    mutationFn: ({ channelId, body }: { channelId: string; body: string }) =>
      api.post(`${apiBase}/channels/${channelId}/messages`, { body }).then((res) => res.data),
  });

  const selected = channels.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (selected && selected.unreadCount > 0) markRead.mutate(selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.unreadCount]);

  useEffect(() => {
    const socket = getTeamChatSocket();
    if (!socket) return;
    const onNewMessage = (payload: { channelId: string; message: TeamChannelMessage }) => {
      queryClient.setQueryData<TeamChannelMessage[]>(['team-chat-messages', payload.channelId], (current) =>
        current ? [...current, payload.message] : current
      );
      queryClient.invalidateQueries({ queryKey: ['team-chat-channels'] });
    };
    socket.on('message:new', onNewMessage);
    return () => {
      socket.off('message:new', onNewMessage);
    };
  }, [queryClient]);

  useEffect(() => {
    if (selectedId) getTeamChatSocket()?.emit('channel:join', { channelId: selectedId });
  }, [selectedId]);

  const handleSend = () => {
    const body = draft.trim();
    if (!body || !selected) return;
    sendMessage.mutate({ channelId: selected.id, body });
    setDraft('');
  };

  if (selected) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-ink-200 px-3 py-2">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm text-ink-400 hover:bg-ink-100"
          >
            <ChevronLeft size={14} />
          </button>
          <Avatar name={selected.name} size="sm" />
          <p className="truncate text-sm font-medium text-ink-900">
            {selected.type === 'channel' ? `# ${selected.name}` : selected.name}
          </p>
        </div>

        <MiniThread messages={messages.slice(-THREAD_LIMIT)} mineType={mineType} currentUserId={currentUser?.id} />

        <div className="flex flex-shrink-0 items-center gap-2 border-t border-ink-200 p-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Reply…"
            className="h-8 flex-1 rounded-sm border border-ink-300 bg-bone-50 px-2.5 text-sm placeholder:text-ink-400 focus:border-brass-500 focus:outline-none focus:ring-2 focus:ring-brass-200"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || sendMessage.isPending}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm bg-pine-900 text-bone-50 transition-colors duration-hover ease-brand hover:bg-pine-950 disabled:opacity-50"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <PanelSkeletonList count={4} />;
  }

  if (channels.length === 0) {
    return <PanelEmptyState icon={<MessageSquare className="h-6 w-6 text-ink-300" />} message="No conversations yet." />;
  }

  return (
    <div className="divide-y divide-ink-100">
      {[...channels]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .map((channel, index) => (
          <PanelListRow as="button" key={channel.id} index={index} onClick={() => setSelectedId(channel.id)} className="w-full text-left">
            <ChannelAvatar channel={channel} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-ink-900">
                  {channel.type === 'channel' ? `# ${channel.name}` : channel.name}
                </p>
                {channel.unreadCount > 0 && <Badge variant="brass">{channel.unreadCount}</Badge>}
              </div>
              <p className="truncate text-xs text-ink-500">
                {channel.lastMessage ? `${channel.lastMessage.senderName}: ${channel.lastMessage.body}` : 'No messages yet'}
              </p>
            </div>
          </PanelListRow>
        ))}
    </div>
  );
}

/** Avatar plus the counterpart's presence dot for DMs. */
function ChannelAvatar({ channel }: { channel: TeamChannelSummary }) {
  const presence = usePresenceStore((s) =>
    channel.counterpart ? s.entries[`${channel.counterpart.type}:${channel.counterpart.id}`] : undefined,
  );
  if (!channel.counterpart) return <Avatar name={channel.name} size="sm" />;
  return (
    <PresenceBadge state={presenceStateOf(presence)} size="sm">
      <Avatar name={channel.name} size="sm" />
    </PresenceBadge>
  );
}

function MiniThread({
  messages,
  mineType,
  currentUserId,
}: {
  messages: TeamChannelMessage[];
  mineType: string;
  currentUserId?: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-bone-50">
        <p className="text-xs text-ink-400">No messages yet. Say hello!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-2.5 overflow-y-auto bg-bone-50 px-3 py-3">
      {messages.map((message) => {
        const mine = message.senderType === mineType && message.senderId === currentUserId;
        return (
          <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${mine ? 'text-right' : 'text-left'}`}>
              {message.isDeleted ? (
                <div className="inline-block rounded-lg border border-dashed border-ink-200 px-3 py-1.5 text-xs italic text-ink-400">
                  This message was deleted
                </div>
              ) : (
                <div
                  className={`inline-block rounded-lg px-3 py-1.5 text-xs ${
                    mine
                      ? 'rounded-br-sm bg-pine-900 text-bone-50'
                      : 'rounded-bl-sm border border-ink-200 bg-bone-100 text-ink-900'
                  }`}
                >
                  {message.body}
                  {!!message.attachments?.length && (
                    <span
                      className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? 'text-bone-50/70' : 'text-ink-500'}`}
                    >
                      <Paperclip size={9} />
                      {message.attachments.length}{' '}
                      {message.attachments.length === 1 ? 'attachment' : 'attachments'} · open in the app
                    </span>
                  )}
                </div>
              )}
              <div className="mt-0.5 text-[10px] text-ink-400">{format(new Date(message.createdAt), 'h:mm a')}</div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
