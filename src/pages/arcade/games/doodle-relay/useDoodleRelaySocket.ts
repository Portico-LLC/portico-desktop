import { useCallback, useEffect, useRef, useState } from 'react';
import { getArcadeSocket } from '@/lib/arcadeSocket';
import type {
  DoodleRoundStartPayload,
  DoodleRoundStartArtistPayload,
  DoodleStrokePayload,
  DoodleClearPayload,
  DoodleGuessResultPayload,
  DoodleGuessPublicPayload,
  DoodleGuessCorrectPayload,
  DoodleRoundRevealPayload,
  DoodleMatchEndPayload,
  DoodleTool,
} from '@/lib/types';

export interface GuessFeedEntry {
  key: number;
  seat: number;
  text: string;
  correct: boolean;
}

interface UseDoodleRelaySocketOptions {
  roomId: string;
  /** Strokes/clears are forwarded directly to the caller (the canvas draws them
   *  imperatively) rather than round-tripping through React state — ink is drawn once and
   *  persists, so there's nothing to "re-render from," unlike Snake Royale's per-tick
   *  positions. */
  onStroke: (payload: DoodleStrokePayload) => void;
  onClear: () => void;
  onMatchEnd?: (payload: DoodleMatchEndPayload) => void;
}

export function useDoodleRelaySocket({ roomId, onStroke, onClear, onMatchEnd }: UseDoodleRelaySocketOptions) {
  const [roundStart, setRoundStart] = useState<DoodleRoundStartPayload | null>(null);
  const [myWord, setMyWord] = useState<string | null>(null);
  const [reveal, setReveal] = useState<DoodleRoundRevealPayload | null>(null);
  const [guessFeed, setGuessFeed] = useState<GuessFeedEntry[]>([]);
  const [myLastResult, setMyLastResult] = useState<DoodleGuessResultPayload | null>(null);
  const feedKeyRef = useRef(0);
  const onStrokeRef = useRef(onStroke);
  onStrokeRef.current = onStroke;
  const onClearRef = useRef(onClear);
  onClearRef.current = onClear;
  const onMatchEndRef = useRef(onMatchEnd);
  onMatchEndRef.current = onMatchEnd;

  useEffect(() => {
    const socket = getArcadeSocket();
    if (!socket) return;

    const handleRoundStart = (payload: DoodleRoundStartPayload) => {
      if (payload.roomId !== roomId) return;
      setRoundStart(payload);
      setMyWord(null);
      setReveal(null);
      setGuessFeed([]);
      setMyLastResult(null);
      onClearRef.current();
    };
    const handleRoundStartArtist = (payload: DoodleRoundStartArtistPayload) => {
      if (payload.roomId !== roomId) return;
      setMyWord(payload.word);
    };
    const handleStroke = (payload: DoodleStrokePayload) => {
      if (payload.roomId !== roomId) return;
      onStrokeRef.current(payload);
    };
    const handleClear = (payload: DoodleClearPayload) => {
      if (payload.roomId !== roomId) return;
      onClearRef.current();
    };
    const handleGuessResult = (payload: DoodleGuessResultPayload) => {
      if (payload.roomId !== roomId) return;
      setMyLastResult(payload);
    };
    const handleGuessPublic = (payload: DoodleGuessPublicPayload) => {
      if (payload.roomId !== roomId) return;
      setGuessFeed((f) => [...f, { key: feedKeyRef.current++, seat: payload.seat, text: payload.text, correct: false }].slice(-30));
    };
    const handleGuessCorrect = (payload: DoodleGuessCorrectPayload) => {
      if (payload.roomId !== roomId) return;
      setGuessFeed((f) => [...f, { key: feedKeyRef.current++, seat: payload.seat, text: '', correct: true }].slice(-30));
    };
    const handleReveal = (payload: DoodleRoundRevealPayload) => {
      if (payload.roomId !== roomId) return;
      setReveal(payload);
    };
    const handleMatchEnd = (payload: DoodleMatchEndPayload) => {
      if (payload.roomId !== roomId) return;
      onMatchEndRef.current?.(payload);
    };

    socket.on('doodle:round:start', handleRoundStart);
    socket.on('doodle:round:start:artist', handleRoundStartArtist);
    socket.on('doodle:stroke', handleStroke);
    socket.on('doodle:clear', handleClear);
    socket.on('doodle:guess:result', handleGuessResult);
    socket.on('doodle:guess:public', handleGuessPublic);
    socket.on('doodle:guess:correct', handleGuessCorrect);
    socket.on('doodle:round:reveal', handleReveal);
    socket.on('doodle:match:end', handleMatchEnd);
    // Must come after every socket.on() above — asks the server to replay the current round
    // (and, if we're the artist, the secret word privately). Without this, a client that
    // mounts after the engine's one-shot round-start broadcast already fired — which is the
    // common case, since that broadcast goes out the instant the match starts, well before
    // this component's REST-refetch-then-mount cycle can finish — is stuck showing nothing
    // until the *next* round, and a page refresh mid-round has no recovery at all.
    socket.emit('game:resume', { roomId });
    return () => {
      socket.off('doodle:round:start', handleRoundStart);
      socket.off('doodle:round:start:artist', handleRoundStartArtist);
      socket.off('doodle:stroke', handleStroke);
      socket.off('doodle:clear', handleClear);
      socket.off('doodle:guess:result', handleGuessResult);
      socket.off('doodle:guess:public', handleGuessPublic);
      socket.off('doodle:guess:correct', handleGuessCorrect);
      socket.off('doodle:round:reveal', handleReveal);
      socket.off('doodle:match:end', handleMatchEnd);
    };
  }, [roomId]);

  const sendStroke = useCallback(
    (payload: { strokeId: string; phase: 'start' | 'move' | 'end'; point?: { x: number; y: number }; color?: string; width?: number; tool?: DoodleTool }) => {
      getArcadeSocket()?.emit('doodle:stroke', { roomId, ...payload });
    },
    [roomId],
  );
  const sendClear = useCallback(() => {
    getArcadeSocket()?.emit('doodle:clear', { roomId });
  }, [roomId]);
  const sendGuess = useCallback(
    (text: string) => {
      getArcadeSocket()?.emit('doodle:guess', { roomId, text });
    },
    [roomId],
  );

  return { roundStart, myWord, reveal, guessFeed, myLastResult, sendStroke, sendClear, sendGuess };
}
