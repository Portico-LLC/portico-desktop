import { io, type Socket } from 'socket.io-client';
import { API_URL } from '@/lib/api';

let socket: Socket | null = null;

export function connectArcadeSocket(token: string): Socket {
  if (socket) socket.disconnect();
  socket = io(`${API_URL}/arcade`, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    // Skip the HTTP long-polling handshake and connect straight over a WebSocket — polling
    // adds a real round-trip of latency to the initial connect (and to every message until
    // the upgrade completes), which matters for Snake Royale's tick-driven gameplay.
    transports: ['websocket'],
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
