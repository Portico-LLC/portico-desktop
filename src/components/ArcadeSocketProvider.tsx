import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { connectArcadeSocket, disconnectArcadeSocket } from '@/lib/arcadeSocket';

/** Connected app-wide (like TeamChatSocketProvider), not just while on /arcade, so a game
 *  invite can surface from any page — heavy in-match traffic stays opt-in per room via the
 *  gateway's `room:join` event, so this idle connection costs nothing extra. Clients never
 *  get the `games` module, so this simply doesn't connect for that role. */
export function ArcadeSocketProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!isAuthenticated || !token || (role !== 'user' && role !== 'employee')) {
      disconnectArcadeSocket();
      return;
    }
    const socket = connectArcadeSocket(token);
    const onConnect = () => queryClient.invalidateQueries({ queryKey: ['arcade-rooms'] });
    const onRoomEvent = () => queryClient.invalidateQueries({ queryKey: ['arcade-rooms'] });
    socket.on('connect', onConnect);
    socket.on('room:created', onRoomEvent);
    socket.on('room:updated', onRoomEvent);
    return () => {
      socket.off('connect', onConnect);
      socket.off('room:created', onRoomEvent);
      socket.off('room:updated', onRoomEvent);
      disconnectArcadeSocket();
    };
  }, [isAuthenticated, token, role, queryClient]);

  return <>{children}</>;
}
