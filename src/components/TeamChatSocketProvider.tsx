import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { connectTeamChatSocket, disconnectTeamChatSocket } from '@/lib/socket';
import { usePresenceStore } from '@/store/presence';
import type { PresenceEntry, PresencePeek } from '@/lib/types';

export function TeamChatSocketProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const token = useAuthStore((s) => s.token);
  const applyPresence = usePresenceStore((s) => s.apply);
  const applySnapshot = usePresenceStore((s) => s.applySnapshot);
  const resetPresence = usePresenceStore((s) => s.reset);

  useEffect(() => {
    if (!isAuthenticated || !token || (role !== 'user' && role !== 'employee' && role !== 'client')) {
      disconnectTeamChatSocket();
      resetPresence();
      return;
    }
    const socket = connectTeamChatSocket(token);
    const onConnect = () => queryClient.invalidateQueries({ queryKey: ['team-chat-channels'] });

    // Presence is fed here rather than on the Messages page: the desktop panel, the sidebar
    // and the DM dialogs all show availability without that page ever being mounted.
    const onSnapshot = (payload: { entries: PresenceEntry[] }) => applySnapshot(payload.entries);
    const onUpdate = (entry: PresenceEntry) => applyPresence(entry);
    const onPeek = (entry: PresencePeek) => applyPresence(entry);

    socket.on('connect', onConnect);
    socket.on('presence:snapshot', onSnapshot);
    socket.on('presence:update', onUpdate);
    socket.on('presence:peek', onPeek);
    return () => {
      socket.off('connect', onConnect);
      socket.off('presence:snapshot', onSnapshot);
      socket.off('presence:update', onUpdate);
      socket.off('presence:peek', onPeek);
      disconnectTeamChatSocket();
    };
  }, [isAuthenticated, token, role, queryClient, applyPresence, applySnapshot, resetPresence]);

  return <>{children}</>;
}
