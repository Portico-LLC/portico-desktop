import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { connectTeamChatSocket, disconnectTeamChatSocket } from '@/lib/socket';

export function TeamChatSocketProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!isAuthenticated || !token || (role !== 'user' && role !== 'employee' && role !== 'client')) {
      disconnectTeamChatSocket();
      return;
    }
    const socket = connectTeamChatSocket(token);
    const onConnect = () => queryClient.invalidateQueries({ queryKey: ['team-chat-channels'] });
    socket.on('connect', onConnect);
    return () => {
      socket.off('connect', onConnect);
      disconnectTeamChatSocket();
    };
  }, [isAuthenticated, token, role, queryClient]);

  return <>{children}</>;
}
