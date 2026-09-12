import { useSyncExternalStore } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from '@/lib/api';

let socket: Socket | null = null;

/**
 * Bumped whenever the socket instance changes, so React can re-subscribe.
 *
 * This matters because effects run child-first: a component that binds listeners would
 * otherwise run before the provider above it has connected, see `null`, and never attach
 * anything. Subscribers re-run when this changes.
 */
let version = 0;
const listeners = new Set<() => void>();

function emitChange(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function connectTeamChatSocket(token: string): Socket {
  if (socket) socket.disconnect();
  socket = io(`${API_URL}/team-chat`, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
  });
  emitChange();
  return socket;
}

export function disconnectTeamChatSocket(): void {
  socket?.disconnect();
  socket = null;
  emitChange();
}

export function getTeamChatSocket(): Socket | null {
  return socket;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Re-renders the caller whenever the socket is created or torn down. */
export function useTeamChatSocket(): Socket | null {
  useSyncExternalStore(subscribe, () => version, () => version);
  return socket;
}
