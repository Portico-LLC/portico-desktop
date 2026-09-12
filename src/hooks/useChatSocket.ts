import { useEffect, useRef } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { getTeamChatSocket, useTeamChatSocket } from '@/lib/socket';
import type { TeamChannelMessage, ChatReaction, FocusDigest } from '@/lib/types';

export interface TypingActor {
  actorId: string;
  parentMessageId: string | null;
}

type MessagePages = InfiniteData<TeamChannelMessage[], string | null>;

/**
 * Every chat socket event in one place, mapped onto the React Query cache.
 *
 * Replaces the inline effect this page used to carry, which tore down and re-registered all
 * five listeners on every channel switch because the selected id sat in its dependency
 * array. Here the selection lives in a ref, so the listeners are bound exactly once.
 */
export function useChatSocket({
  selectedChannelId,
  openThreadId,
  onTyping,
  onFocusDigest,
}: {
  selectedChannelId: string | null;
  openThreadId: string | null;
  onTyping: (actor: TypingActor, typing: boolean) => void;
  onFocusDigest?: (digest: FocusDigest) => void;
}) {
  const queryClient = useQueryClient();
  // Subscribing to the instance rather than reading it once: effects run child-first, so on
  // a cold load this hook runs before the provider above it has connected.
  const socket = useTeamChatSocket();

  // Refs, not deps: these change as the user clicks around, and rebinding every listener
  // each time is both wasteful and a race waiting to happen.
  const channelRef = useRef(selectedChannelId);
  const threadRef = useRef(openThreadId);
  const typingRef = useRef(onTyping);
  const digestRef = useRef(onFocusDigest);
  channelRef.current = selectedChannelId;
  threadRef.current = openThreadId;
  typingRef.current = onTyping;
  digestRef.current = onFocusDigest;

  useEffect(() => {
    if (!socket) return;

    /** Applies a change to whichever cached list holds this message. */
    const updateMessage = (channelId: string, message: TeamChannelMessage) => {
      const key = message.parentMessageId
        ? ['team-chat-thread', message.parentMessageId]
        : ['team-chat-messages', channelId];

      if (message.parentMessageId) {
        queryClient.setQueryData<TeamChannelMessage[]>(key, (current) =>
          current?.map((m) => (m.id === message.id ? message : m)),
        );
        return;
      }
      queryClient.setQueryData<MessagePages>(key, (current) => {
        if (!current) return current;
        return {
          ...current,
          pages: current.pages.map((page) => page.map((m) => (m.id === message.id ? message : m))),
        };
      });
    };

    const onNewMessage = (payload: { channelId: string; message: TeamChannelMessage }) => {
      queryClient.setQueryData<MessagePages>(['team-chat-messages', payload.channelId], (current) => {
        if (!current) return current;
        // Guard against the echo of our own POST, which already appended optimistically.
        const exists = current.pages.some((page) => page.some((m) => m.id === payload.message.id));
        if (exists) return current;
        const pages = [...current.pages];
        pages[pages.length - 1] = [...pages[pages.length - 1], payload.message];
        return { ...current, pages };
      });
      queryClient.invalidateQueries({ queryKey: ['team-chat-channels'] });
    };

    const onMessageUpdated = (payload: { channelId: string; message: TeamChannelMessage }) => {
      updateMessage(payload.channelId, payload.message);
      queryClient.invalidateQueries({ queryKey: ['team-chat-pinned', payload.channelId] });
    };

    const onReactions = (payload: { channelId: string; messageId: string; reactions: ChatReaction[] }) => {
      const apply = (m: TeamChannelMessage) =>
        m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m;

      queryClient.setQueryData<MessagePages>(['team-chat-messages', payload.channelId], (current) =>
        current ? { ...current, pages: current.pages.map((page) => page.map(apply)) } : current,
      );
      // A reaction can land on a message shown in an open thread panel, too.
      if (threadRef.current) {
        queryClient.setQueryData<TeamChannelMessage[]>(['team-chat-thread', threadRef.current], (current) =>
          current?.map(apply),
        );
      }
    };

    const onThreadReply = (payload: {
      channelId: string;
      parentMessageId: string;
      replyCount: number;
      lastReplyAt: string | null;
      message: TeamChannelMessage;
    }) => {
      // The parent's summary line updates whether or not the thread is open.
      queryClient.setQueryData<MessagePages>(['team-chat-messages', payload.channelId], (current) =>
        current
          ? {
              ...current,
              pages: current.pages.map((page) =>
                page.map((m) =>
                  m.id === payload.parentMessageId
                    ? { ...m, replyCount: payload.replyCount, lastReplyAt: payload.lastReplyAt }
                    : m,
                ),
              ),
            }
          : current,
      );

      if (threadRef.current === payload.parentMessageId) {
        queryClient.setQueryData<TeamChannelMessage[]>(['team-chat-thread', payload.parentMessageId], (current) => {
          if (!current) return current;
          if (current.some((m) => m.id === payload.message.id)) return current;
          return [...current, payload.message];
        });
      }
    };

    const onChannelsChanged = () => queryClient.invalidateQueries({ queryKey: ['team-chat-channels'] });

    const onTypingStart = (payload: { channelId: string; actorId: string; parentMessageId: string | null }) => {
      if (payload.channelId !== channelRef.current) return;
      typingRef.current({ actorId: payload.actorId, parentMessageId: payload.parentMessageId }, true);
    };
    const onTypingStop = (payload: { channelId: string; actorId: string; parentMessageId: string | null }) => {
      if (payload.channelId !== channelRef.current) return;
      typingRef.current({ actorId: payload.actorId, parentMessageId: payload.parentMessageId }, false);
    };

    const onDigest = (digest: FocusDigest) => {
      // Everything held during focus is now in the inbox, so the bell has to recount.
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      digestRef.current?.(digest);
    };

    socket.on('message:new', onNewMessage);
    socket.on('message:updated', onMessageUpdated);
    socket.on('message:reactions', onReactions);
    socket.on('thread:reply', onThreadReply);
    socket.on('message:read', onChannelsChanged);
    socket.on('channel:created', onChannelsChanged);
    socket.on('channel:updated', onChannelsChanged);
    socket.on('channel:member_joined', onChannelsChanged);
    socket.on('channel:member_left', onChannelsChanged);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    socket.on('focus:digest', onDigest);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('message:updated', onMessageUpdated);
      socket.off('message:reactions', onReactions);
      socket.off('thread:reply', onThreadReply);
      socket.off('message:read', onChannelsChanged);
      socket.off('channel:created', onChannelsChanged);
      socket.off('channel:updated', onChannelsChanged);
      socket.off('channel:member_joined', onChannelsChanged);
      socket.off('channel:member_left', onChannelsChanged);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      socket.off('focus:digest', onDigest);
    };
  }, [queryClient, socket]);
}

/**
 * Reports this tab as away when it goes to the background, so someone with a window open
 * behind their editor doesn't read as actively online. Deliberately client-driven — only the
 * browser knows whether its window is actually in front.
 */
export function usePresenceVisibility(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const report = () => getTeamChatSocket()?.emit('presence:away', { away: document.hidden });
    document.addEventListener('visibilitychange', report);
    return () => document.removeEventListener('visibilitychange', report);
  }, [enabled]);
}
