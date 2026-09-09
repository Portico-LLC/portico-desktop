import { io, type Socket } from 'socket.io-client';
import { API_URL } from '@/lib/api';

let socket: Socket | null = null;

/** The live-call channel carries settled transcript text, never audio — audio goes
 *  straight from this app to Deepgram. Kept separate from the team-chat socket so a
 *  call's traffic can't be starved by chat activity, and vice versa. */
export function connectCallsSocket(token: string): Socket {
  if (socket?.connected) return socket;
  if (socket) socket.disconnect();
  socket = io(`${API_URL}/calls`, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    transports: ['websocket'],
  });
  return socket;
}

export function disconnectCallsSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getCallsSocket(): Socket | null {
  return socket;
}
