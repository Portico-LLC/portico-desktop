import { useCallback, useEffect, useRef, useState } from 'react';
import { getArcadeSocket } from '@/lib/arcadeSocket';
import type {
  SnakeRoundStartPayload,
  SnakeTickPayload,
  SnakeRoundEndPayload,
  SnakeMatchEndPayload,
  Direction,
} from '@/lib/types';

export interface TickSnapshot extends SnakeTickPayload {
  /** performance.now() at the moment this snapshot was received — the render loop's
   *  interpolation clock is anchored to this, not to the server's tick number, since we only
   *  care about smoothing what the client actually saw and when. */
  receivedAt: number;
}

interface SnapshotBuffer {
  prev: TickSnapshot | null;
  current: TickSnapshot | null;
}

interface UseSnakeRoyaleSocketOptions {
  roomId: string;
  onMatchEnd?: (payload: SnakeMatchEndPayload) => void;
}

/**
 * High-frequency state (tick snapshots, ~15/sec) lives in a ref, updated imperatively —
 * NOT React state — so the canvas's own requestAnimationFrame loop can read the latest
 * snapshot every frame without forcing 15 React re-renders per second for data that never
 * touches the DOM directly. Only the rare events (round start/end) use useState, since those
 * genuinely drive React-rendered UI (the HUD, the round-end banner).
 */
export function useSnakeRoyaleSocket({ roomId, onMatchEnd }: UseSnakeRoyaleSocketOptions) {
  const bufferRef = useRef<SnapshotBuffer>({ prev: null, current: null });
  const deathsRef = useRef<{ seat: number; at: number }[]>([]);
  const [roundStart, setRoundStart] = useState<SnakeRoundStartPayload | null>(null);
  const [roundEnd, setRoundEnd] = useState<SnakeRoundEndPayload | null>(null);
  const onMatchEndRef = useRef(onMatchEnd);
  onMatchEndRef.current = onMatchEnd;

  useEffect(() => {
    const socket = getArcadeSocket();
    if (!socket) return;

    const onRoundStart = (payload: SnakeRoundStartPayload) => {
      if (payload.roomId !== roomId) return;
      bufferRef.current = {
        prev: null,
        current: {
          roomId: payload.roomId,
          tick: 0,
          snakes: payload.snakes,
          pickups: payload.pickups,
          arenaBounds: payload.arenaBounds,
          deaths: [],
          receivedAt: performance.now(),
        },
      };
      deathsRef.current = [];
      setRoundEnd(null);
      setRoundStart(payload);
    };

    const onTick = (payload: SnakeTickPayload) => {
      if (payload.roomId !== roomId) return;
      const snapshot: TickSnapshot = { ...payload, receivedAt: performance.now() };
      bufferRef.current = { prev: bufferRef.current.current, current: snapshot };
      if (payload.deaths.length) {
        const now = performance.now();
        deathsRef.current = [...deathsRef.current, ...payload.deaths.map((seat) => ({ seat, at: now }))];
      }
    };

    const onRoundEndEvent = (payload: SnakeRoundEndPayload) => {
      if (payload.roomId !== roomId) return;
      setRoundEnd(payload);
    };

    const onMatchEndEvent = (payload: SnakeMatchEndPayload) => {
      if (payload.roomId !== roomId) return;
      onMatchEndRef.current?.(payload);
    };

    socket.on('snake:round:start', onRoundStart);
    socket.on('snake:tick', onTick);
    socket.on('snake:round:end', onRoundEndEvent);
    socket.on('snake:match:end', onMatchEndEvent);
    // Must come after every socket.on() above — asks the server to replay the current round
    // (covers a client that mounted after the engine's first broadcast, or a page refresh
    // mid-match). Snake Royale mostly self-heals within one ~90ms tick regardless, but this
    // closes the gap outright instead of relying on that.
    socket.emit('game:resume', { roomId });
    return () => {
      socket.off('snake:round:start', onRoundStart);
      socket.off('snake:tick', onTick);
      socket.off('snake:round:end', onRoundEndEvent);
      socket.off('snake:match:end', onMatchEndEvent);
    };
  }, [roomId]);

  const sendDirection = useCallback(
    (direction: Direction) => {
      getArcadeSocket()?.emit('snake:input', { roomId, direction });
    },
    [roomId],
  );

  return { bufferRef, deathsRef, roundStart, roundEnd, sendDirection };
}
