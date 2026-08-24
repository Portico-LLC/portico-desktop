import { io, type Socket } from 'socket.io-client';
import { API_URL } from '@/lib/api';

let socket: Socket | null = null;

export function connectTeamChatSocket(token: string): Socket {
  if (socket) socket.disconnect();
  socket = io(`${API_URL}/team-chat`, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
  });
  return socket;
}

export function disconnectTeamChatSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getTeamChatSocket(): Socket | null {
  return socket;
}
