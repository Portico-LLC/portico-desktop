import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { getTeamChatSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth';
import { usePresenceStore } from '@/store/presence';
import { useChatSocket, usePresenceVisibility, type TypingActor } from '@/hooks/useChatSocket';
import { useNotificationToastStore } from '@/store/notificationToast';
import type {
  TeamChannelSummary,
  TeamChannelMessage,
  TeamMemberOption,
  TeamMemberType,
  PresenceEntry,
} from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChannelRail } from '@/components/chat/ChannelRail';
import { ChannelHeader } from '@/components/chat/ChannelHeader';
import { MessageList } from '@/components/chat/MessageList';
import { Composer } from '@/components/chat/Composer';
import { ThreadPanel } from '@/components/chat/ThreadPanel';
import { FocusModeControl } from '@/components/chat/FocusModeControl';
import { ChannelBrowserDialog, NewDmDialog } from '@/components/chat/ChannelDialogs';
import type { MessageRowActions } from '@/components/chat/MessageRow';
import { MessageSquare } from 'lucide-react';

const TYPING_IDLE_MS = 2000;
const PAGE_SIZE = 50;

export function TeamChat() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const role = useAuthStore((s) => s.role);
  const currentUser = useAuthStore((s) => s.user);
  const isClient = role === 'client';
  const myType: TeamMemberType = role === 'employee' ? 'employee' : role === 'client' ? 'client' : 'owner';
  const myId = currentUser?.id ?? '';
  const apiBase = isClient ? '/client/team-chat' : '/team-chat';

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [threadParentId, setThreadParentId] = useState<string | null>(null);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [newDmOpen, setNewDmOpen] = useState(false);
  const [typingActors, setTypingActors] = useState<TypingActor[]>([]);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const pushToast = useNotificationToastStore((s) => s.push);
  const presenceEntries = usePresenceStore((s) => s.entries);

  usePresenceVisibility(!isClient);

  // ---------------------------------------------------------------- queries

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['team-chat-channels', apiBase],
    queryFn: () => api.get<TeamChannelSummary[]>(`${apiBase}/channels`).then((res) => res.data),
  });

  // The roster 401s for clients, and that cascades into a global logout via the api
  // interceptor — so it stays strictly studio-side.
  const { data: members = [] } = useQuery({
    queryKey: ['team-chat-members'],
    queryFn: () => api.get<TeamMemberOption[]>('/team-chat/members').then((res) => res.data),
    enabled: !isClient,
    staleTime: 5 * 60_000,
  });

  const selected = channels.find((c) => c.id === selectedId) ?? null;

  const messagesQuery = useInfiniteQuery({
    queryKey: ['team-chat-messages', selectedId],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api
        .get<TeamChannelMessage[]>(`${apiBase}/channels/${selectedId}/messages`, {
          params: { limit: PAGE_SIZE, ...(pageParam ? { before: pageParam } : {}) },
        })
        .then((res) => res.data),
    // Pages arrive oldest-first; the cursor for the next (older) page is the top message.
    getNextPageParam: (lastPage) =>
      lastPage.length < PAGE_SIZE ? undefined : lastPage[0]?.createdAt ?? undefined,
    enabled: !!selectedId,
  });

  const { data: pinned = [] } = useQuery({
    queryKey: ['team-chat-pinned', selectedId],
    queryFn: () => api.get<TeamChannelMessage[]>(`${apiBase}/channels/${selectedId}/pinned`).then((res) => res.data),
    enabled: !!selectedId,
  });

  /** Older pages are fetched after the first, so they have to be prepended, not appended. */
  const messages = useMemo(() => {
    const pages = messagesQuery.data?.pages ?? [];
    return [...pages].reverse().flat();
  }, [messagesQuery.data]);

  const threadParent = useMemo(
    () => (threadParentId ? messages.find((m) => m.id === threadParentId) ?? null : null),
    [messages, threadParentId],
  );

  // ---------------------------------------------------------------- mutations

  const sendMessage = useMutation({
    mutationFn: (payload: {
      channelId: string;
      body: string;
      attachmentIds?: string[];
      parentMessageId?: string;
      notifyAnyway?: boolean;
    }) =>
      api
        .post<TeamChannelMessage>(`${apiBase}/channels/${payload.channelId}/messages`, {
          body: payload.body,
          ...(payload.attachmentIds?.length ? { attachmentIds: payload.attachmentIds } : {}),
          ...(payload.parentMessageId ? { parentMessageId: payload.parentMessageId } : {}),
          ...(payload.notifyAnyway ? { notifyAnyway: true } : {}),
        })
        .then((res) => res.data),
    meta: { errorTitle: 'Message not sent' },
  });

  const markRead = useMutation({
    mutationFn: (channelId: string) => api.patch(`${apiBase}/channels/${channelId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-chat-channels'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const editMessage = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      api.patch<TeamChannelMessage>(`${apiBase}/messages/${id}`, { body }).then((res) => res.data),
    meta: { errorTitle: 'Could not edit message' },
  });

  const deleteMessage = useMutation({
    mutationFn: (id: string) => api.delete<TeamChannelMessage>(`${apiBase}/messages/${id}`).then((res) => res.data),
    meta: { successMessage: 'Message deleted', errorTitle: 'Could not delete message' },
  });

  const togglePin = useMutation({
    mutationFn: ({ id, pinned: next }: { id: string; pinned: boolean }) =>
      next
        ? api.post<TeamChannelMessage>(`${apiBase}/messages/${id}/pin`).then((res) => res.data)
        : api.delete<TeamChannelMessage>(`${apiBase}/messages/${id}/pin`).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-chat-pinned', selectedId] }),
    meta: { errorTitle: 'Could not update pin' },
  });

  const toggleReaction = useMutation({
    mutationFn: ({ id, emoji, mine }: { id: string; emoji: string; mine: boolean }) =>
      mine
        ? api.delete(`${apiBase}/messages/${id}/reactions`, { params: { emoji } })
        : api.post(`${apiBase}/messages/${id}/reactions`, { emoji }),
    meta: { errorTitle: 'Could not update reaction' },
  });

  // ---------------------------------------------------------------- realtime

  const handleTyping = useCallback((actor: TypingActor, typing: boolean) => {
    setTypingActors((prev) => {
      const without = prev.filter((a) => a.actorId !== actor.actorId);
      return typing ? [...without, actor] : without;
    });
  }, []);

  useChatSocket({
    selectedChannelId: selectedId,
    openThreadId: threadParentId,
    onTyping: handleTyping,
    onFocusDigest: (digest) => {
      if (digest.releasedCount === 0) return;
      pushToast({
        id: `focus-digest-${Date.now()}`,
        title: 'Focus mode ended',
        body: `${digest.releasedCount} message${digest.releasedCount === 1 ? '' : 's'} came in across ${
          digest.byChannel.length
        } conversation${digest.byChannel.length === 1 ? '' : 's'} while you were focused.`,
      } as never);
    },
  });

  useEffect(() => {
    if (selectedId || channels.length === 0) return;
    const linkedId = searchParams.get('channel');
    setSelectedId(linkedId && channels.some((c) => c.id === linkedId) ? linkedId : channels[0].id);
  }, [channels, selectedId, searchParams]);

  useEffect(() => {
    if (selected && selected.unreadCount > 0) markRead.mutate(selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.unreadCount]);

  useEffect(() => {
    setTypingActors([]);
    setThreadParentId(null);
    if (selectedId) getTeamChatSocket()?.emit('channel:join', { channelId: selectedId });
  }, [selectedId]);

  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  const emitTyping = useCallback(
    (parentMessageId?: string) => {
      if (!selectedId) return;
      const socket = getTeamChatSocket();
      if (!isTyping.current) {
        isTyping.current = true;
        socket?.emit('typing:start', { channelId: selectedId, parentMessageId });
      }
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        isTyping.current = false;
        socket?.emit('typing:stop', { channelId: selectedId, parentMessageId });
      }, TYPING_IDLE_MS);
    },
    [selectedId],
  );

  const stopTyping = useCallback(() => {
    if (!selectedId) return;
    isTyping.current = false;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    getTeamChatSocket()?.emit('typing:stop', { channelId: selectedId });
  }, [selectedId]);

  // ---------------------------------------------------------------- derived

  const rosterNames = useMemo(() => members.map((m) => m.name), [members]);
  const selfName = useMemo(
    () => members.find((m) => m.type === myType && m.id === myId)?.name,
    [members, myType, myId],
  );

  /** Typing ids resolved to names — the old indicator held ids it never looked up and always
   *  rendered a generic "typing…". */
  const typingNames = useMemo(
    () =>
      typingActors
        .filter((a) => a.actorId !== myId)
        .map((a) => members.find((m) => m.id === a.actorId)?.name)
        .filter((name): name is string => !!name),
    [typingActors, members, myId],
  );

  const counterpartPresence = selected?.counterpart
    ? (presenceEntries[`${selected.counterpart.type}:${selected.counterpart.id}`] as PresenceEntry | undefined)
    : undefined;

  const jumpToMessage = useCallback((messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(messageId);
    window.setTimeout(() => setHighlightId(null), 1800);
  }, []);

  const messageActions: MessageRowActions = useMemo(
    () => ({
      onReact: (id, emoji, mine) => toggleReaction.mutate({ id, emoji, mine }),
      onEdit: (id, body) => editMessage.mutate({ id, body }),
      onDelete: (id) => deleteMessage.mutate(id),
      onTogglePin: (id, next) => togglePin.mutate({ id, pinned: next }),
      onOpenThread: (id) => setThreadParentId(id),
      onCopyLink: (id) => {
        const url = `${window.location.origin}${window.location.pathname}?channel=${selectedId}&message=${id}`;
        void navigator.clipboard?.writeText(url);
      },
    }),
    [toggleReaction, editMessage, deleteMessage, togglePin, selectedId],
  );

  const startDmWithOwner = useMutation({
    mutationFn: () => api.post<TeamChannelSummary>(`${apiBase}/dms`).then((res) => res.data),
    onSuccess: (channel) => {
      queryClient.invalidateQueries({ queryKey: ['team-chat-channels'] });
      setSelectedId(channel.id);
    },
  });

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 font-display text-4xl font-semibold text-ink-900">Messages</h1>
          <p className="text-ink-500">
            {isClient
              ? 'Chat with your studio about your projects.'
              : 'Team channels, project chats with clients, and direct messages — all in one place.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isClient ? (
            <Button variant="primary" onClick={() => startDmWithOwner.mutate()} disabled={startDmWithOwner.isPending}>
              <MessageSquare size={16} />
              Message studio
            </Button>
          ) : (
            <FocusModeControl myType={myType} myId={myId} />
          )}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex h-[calc(100vh-240px)] min-h-[520px]">
          <ChannelRail
            channels={channels}
            loading={isLoading}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onBrowseChannels={isClient ? undefined : () => setBrowserOpen(true)}
            onNewDm={isClient ? undefined : () => setNewDmOpen(true)}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            {!selected ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center text-ink-400">
                  <MessageSquare className="mx-auto mb-3 h-10 w-10 text-ink-200" />
                  <p className="text-sm">Select a conversation to start chatting.</p>
                </div>
              </div>
            ) : (
              <>
                <ChannelHeader
                  channel={selected}
                  apiBase={apiBase}
                  typingNames={typingNames}
                  pinned={pinned}
                  onJumpToMessage={jumpToMessage}
                />

                <MessageList
                  messages={messages}
                  myType={myType}
                  myId={myId}
                  canModerate={myType === 'owner'}
                  apiBase={apiBase}
                  mentionNames={rosterNames}
                  selfName={selfName}
                  actions={messageActions}
                  firstUnreadMessageId={selected.firstUnreadMessageId}
                  hasMore={messagesQuery.hasNextPage}
                  isFetchingMore={messagesQuery.isFetchingNextPage}
                  onLoadMore={() => messagesQuery.fetchNextPage()}
                  highlightMessageId={highlightId}
                />

                <Composer
                  apiBase={apiBase}
                  channelId={selected.id}
                  placeholder={
                    isClient
                      ? 'Type a message…  (Enter to send, Shift+Enter for a new line)'
                      : 'Type a message…  (@ to mention, Enter to send, Shift+Enter for a new line)'
                  }
                  mentionsEnabled={!isClient}
                  disabled={!!selected.archivedAt}
                  counterpartPresence={counterpartPresence}
                  counterpartName={selected.type === 'dm' ? selected.name : undefined}
                  onSend={({ body, attachmentIds, notifyAnyway }) => {
                    sendMessage.mutate({ channelId: selected.id, body, attachmentIds, notifyAnyway });
                    stopTyping();
                  }}
                  onTyping={() => emitTyping()}
                />
              </>
            )}
          </div>

          <AnimatePresence>
            {threadParent && selected && (
              <ThreadPanel
                key={threadParent.id}
                apiBase={apiBase}
                parentMessage={threadParent}
                channelId={selected.id}
                myType={myType}
                myId={myId}
                canModerate={myType === 'owner'}
                mentionNames={rosterNames}
                selfName={selfName}
                mentionsEnabled={!isClient}
                actions={messageActions}
                onClose={() => setThreadParentId(null)}
                onSendReply={({ body, attachmentIds }) => {
                  sendMessage.mutate({
                    channelId: selected.id,
                    body,
                    attachmentIds,
                    parentMessageId: threadParent.id,
                  });
                  stopTyping();
                }}
                onTyping={() => emitTyping(threadParent.id)}
              />
            )}
          </AnimatePresence>
        </div>
      </Card>

      {!isClient && (
        <>
          <ChannelBrowserDialog
            open={browserOpen}
            onOpenChange={setBrowserOpen}
            members={members.filter((m) => !(m.type === myType && m.id === myId))}
            onOpenChannel={setSelectedId}
          />
          <NewDmDialog
            open={newDmOpen}
            onOpenChange={setNewDmOpen}
            members={members.filter((m) => !(m.type === myType && m.id === myId))}
            onCreated={setSelectedId}
          />
        </>
      )}
    </div>
  );
}
