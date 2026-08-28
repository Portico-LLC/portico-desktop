import { useCallback, useEffect, useRef, useState } from 'react';
import { getArcadeSocket } from '@/lib/arcadeSocket';
import type {
  WordBombTurnStartPayload,
  WordBombSubmitResultPayload,
  WordBombEliminatedPayload,
  WordBombRoundEndPayload,
  WordBombMatchEndPayload,
} from '@/lib/types';

interface UseWordBombSocketOptions {
  roomId: string;
  onMatchEnd?: (payload: WordBombMatchEndPayload) => void;
}

/** Wires the five Word Bomb realtime events to local state and exposes `submit`. One hook
 *  instance per room — the arcade socket itself is a single app-wide connection (see
 *  ArcadeSocketProvider), this just filters/dispatches events for this room's game view. */
export function useWordBombSocket({ roomId, onMatchEnd }: UseWordBombSocketOptions) {
  const [turn, setTurn] = useState<WordBombTurnStartPayload | null>(null);
  const [lastResult, setLastResult] = useState<WordBombSubmitResultPayload | null>(null);
  const [roundEnd, setRoundEnd] = useState<WordBombRoundEndPayload | null>(null);
  const [eliminated, setEliminated] = useState<WordBombEliminatedPayload | null>(null);
  const onMatchEndRef = useRef(onMatchEnd);
  onMatchEndRef.current = onMatchEnd;

  useEffect(() => {
    const socket = getArcadeSocket();
    if (!socket) return;

    const onTurnStart = (payload: WordBombTurnStartPayload) => {
      if (payload.roomId !== roomId) return;
      setTurn(payload);
      setRoundEnd(null);
      setEliminated(null);
    };
    const onSubmitResult = (payload: WordBombSubmitResultPayload) => {
      if (payload.roomId !== roomId) return;
      setLastResult(payload);
    };
    const onEliminated = (payload: WordBombEliminatedPayload) => {
      if (payload.roomId !== roomId) return;
      setEliminated(payload);
    };
    const onRoundEnd = (payload: WordBombRoundEndPayload) => {
      if (payload.roomId !== roomId) return;
      setRoundEnd(payload);
      setTurn(null);
    };
    const onMatchEndEvent = (payload: WordBombMatchEndPayload) => {
      if (payload.roomId !== roomId) return;
      onMatchEndRef.current?.(payload);
    };

    socket.on('wordbomb:turn:start', onTurnStart);
    socket.on('wordbomb:submit:result', onSubmitResult);
    socket.on('wordbomb:eliminated', onEliminated);
    socket.on('wordbomb:round:end', onRoundEnd);
    socket.on('wordbomb:match:end', onMatchEndEvent);
    // Must come after every socket.on() above, not before — this asks the server to replay
    // the current turn (covers both a client that mounted after the engine's first
    // broadcast already fired, and a plain page refresh mid-match), and the response can
    // only arrive after this listener registration has already happened.
    socket.emit('game:resume', { roomId });
    return () => {
      socket.off('wordbomb:turn:start', onTurnStart);
      socket.off('wordbomb:submit:result', onSubmitResult);
      socket.off('wordbomb:eliminated', onEliminated);
      socket.off('wordbomb:round:end', onRoundEnd);
      socket.off('wordbomb:match:end', onMatchEndEvent);
    };
  }, [roomId]);

  const submit = useCallback(
    (word: string) => {
      getArcadeSocket()?.emit('wordbomb:submit', { roomId, word });
    },
    [roomId],
  );

  return { turn, lastResult, roundEnd, eliminated, submit };
}
