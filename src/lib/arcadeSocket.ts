import { io, type Socket } from 'socket.io-client';
import { API_URL } from '@/lib/api';

let socket: Socket | null = null;

export function connectArcadeSocket(token: string): Socket {
  if (socket) socket.disconnect();
  socket = io(`${API_URL}/arcade`, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
  });
  return socket;
}

export function disconnectArcadeSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getArcadeSocket(): Socket | null {
  return socket;
}
