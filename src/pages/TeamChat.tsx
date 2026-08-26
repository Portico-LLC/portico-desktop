import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getTeamChatSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth';
import type { TeamChannelSummary, TeamChannelMessage, TeamMemberOption, TeamMemberType } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { MentionTextarea } from '@/components/mentions/MentionTextarea';
import { Plus, Search, Send, Hash, Briefcase, MessageSquare, UserCog } from 'lucide-react';
import { format, isSameDay } from 'date-fns';

const TYPING_IDLE_MS = 2000;

export function TeamChat() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const role = useAuthStore((s) => s.role);
  const currentUser = useAuthStore((s) => s.user);
  const isClient = role === 'client';
  const mineType = role === 'employee' ? 'employee' : role === 'client' ? 'client' : 'owner';
  const apiBase = isClient ? '/client/team-chat' : '/team-chat';

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [newDmOpen, setNewDmOpen] = useState(false);
  const [typingActorIds, setTypingActorIds] = useState<Set<string>>(new Set());

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['team-chat-channels', apiBase],
    queryFn: () => api.get<TeamChannelSummary[]>(`${apiBase}/channels`).then((res) => res.data),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['team-chat-members'],
    queryFn: () => api.get<TeamMemberOption[]>('/team-chat/members').then((res) => res.data),
    enabled: !isClient && (newChannelOpen || newDmOpen),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['team-chat-messages', selectedId],
    queryFn: () => api.get<TeamChannelMessage[]>(`${apiBase}/channels/${selectedId}/messages`).then((res) => res.data),
    enabled: !!selectedId,
  });

  const createChannel = useMutation({
    mutationFn: (payload: { name: string; memberIds: { type: string; id: string }[] }) =>
      api.post<TeamChannelSummary>(`${apiBase}/channels`, payload).then((res) => res.data),
    onSuccess: (channel) => {
      queryClient.invalidateQueries({ queryKey: ['team-chat-channels'] });
      setSelectedId(channel.id);
      setNewChannelOpen(false);
    },
    meta: { successMessage: 'Channel created', errorTitle: 'Could not create channel' },
  });

  const createDm = useMutation({
    mutationFn: (payload: { targetType: string; targetId: string }) =>
      api.post<TeamChannelSummary>(`${apiBase}/dms`, payload).then((res) => res.data),
    onSuccess: (channel) => {
      queryClient.invalidateQueries({ queryKey: ['team-chat-channels'] });
      setSelectedId(channel.id);
      setNewDmOpen(false);
    },
    meta: { successMessage: 'Conversation started', errorTitle: 'Could not start conversation' },
  });

  const startDmWithOwner = useMutation({
    mutationFn: () => api.post<TeamChannelSummary>(`${apiBase}/dms`).then((res) => res.data),
    onSuccess: (channel) => {
      queryClient.invalidateQueries({ queryKey: ['team-chat-channels'] });
      setSelectedId(channel.id);
    },
  });

  const sendMessage = useMutation({
    mutationFn: ({ channelId, body }: { channelId: string; body: string }) =>
      api.post(`${apiBase}/channels/${channelId}/messages`, { body }).then((res) => res.data),
  });

  const markRead = useMutation({
    mutationFn: (channelId: string) => api.patch(`${apiBase}/channels/${channelId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-chat-channels'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const selected = channels.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId || channels.length === 0) return;
    const linkedId = searchParams.get('channel');
    const preselect = linkedId && channels.some((c) => c.id === linkedId) ? linkedId : channels[0].id;
    setSelectedId(preselect);
  }, [channels, selectedId, searchParams]);

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
    const onRead = () => queryClient.invalidateQueries({ queryKey: ['team-chat-channels'] });
    const onChannelCreated = () => queryClient.invalidateQueries({ queryKey: ['team-chat-channels'] });
    const onTypingStart = (payload: { channelId: string; actorId: string }) => {
      if (payload.channelId !== selectedId) return;
      setTypingActorIds((prev) => new Set(prev).add(payload.actorId));
    };
    const onTypingStop = (payload: { channelId: string; actorId: string }) => {
      if (payload.channelId !== selectedId) return;
      setTypingActorIds((prev) => {
        const next = new Set(prev);
        next.delete(payload.actorId);
        return next;
      });
    };

    socket.on('message:new', onNewMessage);
    socket.on('message:read', onRead);
    socket.on('channel:created', onChannelCreated);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('message:read', onRead);
      socket.off('channel:created', onChannelCreated);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
    };
  }, [queryClient, selectedId]);

  useEffect(() => {
    setTypingActorIds(new Set());
    if (selectedId) getTeamChatSocket()?.emit('channel:join', { channelId: selectedId });
  }, [selectedId]);

  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (!selectedId) return;
    const socket = getTeamChatSocket();
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket?.emit('typing:start', { channelId: selectedId });
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket?.emit('typing:stop', { channelId: selectedId });
    }, TYPING_IDLE_MS);
  };

  const handleSend = () => {
    const body = draft.trim();
    if (!body || !selected) return;
    sendMessage.mutate({ channelId: selected.id, body });
    setDraft('');
    isTypingRef.current = false;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    getTeamChatSocket()?.emit('typing:stop', { channelId: selected.id });
  };

  const filteredChannels = channels.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const projectList = filteredChannels.filter((c) => c.type === 'project');
  const channelList = filteredChannels.filter((c) => c.type === 'channel');
  const dmList = filteredChannels.filter((c) => c.type === 'dm');

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-semibold text-ink-900 mb-2">Messages</h1>
          <p className="text-ink-500">
            {isClient
              ? 'Chat with your studio about your projects.'
              : 'Team channels, project chats with clients, and direct messages — all in one place.'}
          </p>
        </div>
        <div className="flex gap-2">
          {isClient ? (
            <Button variant="primary" onClick={() => startDmWithOwner.mutate()} disabled={startDmWithOwner.isPending}>
              <MessageSquare size={16} />
              Message Studio
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setNewDmOpen(true)}>
                <UserCog size={16} />
                New DM
              </Button>
              <Button variant="primary" onClick={() => setNewChannelOpen(true)}>
                <Plus size={18} />
                New Channel
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex h-[calc(100vh-260px)] min-h-[480px]">
          <div className="w-80 border-r border-ink-200 flex flex-col flex-shrink-0 bg-ink-50/50">
            <div className="p-3 border-b border-ink-200">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-ink-400" />
                <Input
                  placeholder="Search..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <ChannelGroup
                    label="Project Chats"
                    icon={<Briefcase size={12} />}
                    channels={projectList}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                  <ChannelGroup
                    label="Channels"
                    icon={<Hash size={12} />}
                    channels={channelList}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                  <ChannelGroup
                    label="Direct Messages"
                    icon={<UserCog size={12} />}
                    channels={dmList}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                  {filteredChannels.length === 0 && (
                    <div className="p-6 text-center text-sm text-ink-400">
                      <MessageSquare className="mx-auto mb-2 h-6 w-6 text-ink-300" />
                      No conversations yet.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-ink-400">
                  <MessageSquare className="mx-auto mb-3 h-10 w-10 text-ink-200" />
                  <p className="text-sm">Select a channel or DM to start chatting.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-5 py-3 border-b border-ink-200 bg-ink-50/50">
                  <div className="flex items-center gap-3">
                    <Avatar name={selected.name} className="h-9 w-9" />
                    <div>
                      <p className="font-medium text-ink-900 leading-tight">
                        {selected.type === 'channel' ? `# ${selected.name}` : selected.name}
                      </p>
                      {typingActorIds.size > 0 && <p className="text-xs text-brass-600">typing…</p>}
                    </div>
                  </div>
                </div>

                <MessageThread messages={messages} mineType={mineType} currentUserId={currentUser?.id} />

                <div className="px-5 py-4 border-t border-ink-200">
                  <div className="flex items-end gap-3">
                    <MentionTextarea
                      className="min-h-[44px] max-h-32"
                      placeholder={
                        isClient
                          ? 'Type a message...  (Enter to send, Shift+Enter for a new line)'
                          : 'Type a message... (@ to mention, Enter to send, Shift+Enter for a new line)'
                      }
                      value={draft}
                      onChange={handleDraftChange}
                      onSubmit={handleSend}
                      mentionsEnabled={!isClient}
                    />
                    <Button
                      variant="primary"
                      size="icon"
                      className="h-[44px] w-[44px] flex-shrink-0"
                      onClick={handleSend}
                      disabled={!draft.trim() || sendMessage.isPending}
                    >
                      <Send size={18} />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={newChannelOpen} onOpenChange={setNewChannelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Channel</DialogTitle>
          </DialogHeader>
          <NewChannelForm
            members={members}
            loading={createChannel.isPending}
            onCancel={() => setNewChannelOpen(false)}
            onSubmit={(payload) => createChannel.mutate(payload)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={newDmOpen} onOpenChange={setNewDmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Direct Message</DialogTitle>
          </DialogHeader>
          <NewDmForm
            members={members.filter((m) => !(m.type === mineType && m.id === currentUser?.id))}
            loading={createDm.isPending}
            onCancel={() => setNewDmOpen(false)}
            onSubmit={(payload) => createDm.mutate(payload)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChannelGroup({
  label,
  icon,
  channels,
  selectedId,
  onSelect,
}: {
  label: string;
  icon: React.ReactNode;
  channels: TeamChannelSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (channels.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 px-4 pt-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-ink-400">
        {icon}
        {label}
      </div>
      {channels.map((channel) => {
        const active = channel.id === selectedId;
        return (
          <button
            key={channel.id}
            onClick={() => onSelect(channel.id)}
            className={`group relative w-full text-left px-4 py-2.5 transition-colors duration-hover ease-brand before:absolute before:left-0 before:top-1/2 before:h-6 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-brass-500 before:transition-opacity before:duration-hover before:ease-brand ${
              active
                ? 'bg-bone-50 before:opacity-100'
                : 'hover:bg-ink-100/70 before:opacity-0 hover:before:opacity-40'
            }`}
          >
            <div className="flex items-start gap-3">
              <Avatar name={channel.name} className="h-8 w-8" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink-900 truncate">
                    {channel.type === 'channel' ? `# ${channel.name}` : channel.name}
                  </p>
                  {channel.lastMessage && (
                    <span className="text-[11px] text-ink-400 flex-shrink-0">
                      {format(new Date(channel.lastMessage.createdAt), 'MMM d')}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs text-ink-500 truncate">
                    {channel.lastMessage
                      ? `${channel.lastMessage.senderName}: ${channel.lastMessage.body}`
                      : 'No messages yet'}
                  </p>
                  {channel.unreadCount > 0 && (
                    <Badge variant="brass" className="flex-shrink-0">
                      {channel.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MessageThread({
  messages,
  mineType,
  currentUserId,
}: {
  messages: TeamChannelMessage[];
  mineType: TeamMemberType;
  currentUserId?: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bone-50">
        <p className="text-sm text-ink-400">No messages yet. Say hello!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 bg-bone-50 space-y-4">
      {messages.map((message, index) => {
        const prev = messages[index - 1];
        const showDate = !prev || !isSameDay(new Date(prev.createdAt), new Date(message.createdAt));
        const mine = message.senderType === mineType && message.senderId === currentUserId;
        return (
          <div key={message.id}>
            {showDate && (
              <div className="flex justify-center my-4">
                <span className="text-[11px] uppercase tracking-wide text-ink-400 bg-ink-100 rounded-full px-3 py-1">
                  {format(new Date(message.createdAt), 'MMMM d, yyyy')}
                </span>
              </div>
            )}
            <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${mine ? 'text-right' : 'text-left'}`}>
                <div
                  className={`inline-block rounded-lg px-4 py-2.5 text-sm shadow-sm ${
                    mine
                      ? 'bg-pine-900 text-bone-50 rounded-br-sm'
                      : 'bg-bone-100 border border-ink-200 text-ink-900 rounded-bl-sm'
                  }`}
                >
                  {message.body}
                </div>
                <div className="text-[11px] text-ink-400 mt-1">
                  {mine ? 'You' : message.senderName} · {format(new Date(message.createdAt), 'h:mm a')}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

function NewChannelForm({
  members,
  loading,
  onSubmit,
  onCancel,
}: {
  members: TeamMemberOption[];
  loading: boolean;
  onSubmit: (payload: { name: string; memberIds: { type: string; id: string }[] }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const valid = name.trim().length >= 2;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        const memberIds = members
          .filter((m) => selected.has(`${m.type}:${m.id}`))
          .map((m) => ({ type: m.type, id: m.id }));
        onSubmit({ name: name.trim(), memberIds });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="channel-name">Channel name</Label>
        <Input id="channel-name" placeholder="e.g. design-team" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Members</Label>
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {members.map((m) => {
            const key = `${m.type}:${m.id}`;
            return (
              <label
                key={key}
                className="flex cursor-pointer select-none items-center gap-3 rounded-sm px-2 py-2 text-sm hover:bg-ink-50"
              >
                <input
                  type="checkbox"
                  checked={selected.has(key)}
                  onChange={() => toggle(key)}
                  className="h-4 w-4 rounded-sm border-ink-300 bg-bone-50 accent-brass-600 focus:ring-2 focus:ring-brass-200"
                />
                {m.name}
              </label>
            );
          })}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!valid || loading}>
          {loading ? 'Creating…' : 'Create Channel'}
        </Button>
      </div>
    </form>
  );
}

function NewDmForm({
  members,
  loading,
  onSubmit,
  onCancel,
}: {
  members: TeamMemberOption[];
  loading: boolean;
  onSubmit: (payload: { targetType: string; targetId: string }) => void;
  onCancel: () => void;
}) {
  const [target, setTarget] = useState('');

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!target) return;
        const [targetType, targetId] = target.split(':');
        onSubmit({ targetType, targetId });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="dm-target">Team member</Label>
        <select
          id="dm-target"
          className="flex h-10 w-full rounded-sm border border-ink-300 bg-bone-50 px-3 text-sm focus:border-brass-500 focus:outline-none"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value="">Select a team member...</option>
          {members.map((m) => (
            <option key={`${m.type}:${m.id}`} value={`${m.type}:${m.id}`}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!target || loading}>
          {loading ? 'Starting…' : 'Start DM'}
        </Button>
      </div>
    </form>
  );
}
