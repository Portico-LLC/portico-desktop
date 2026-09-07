import { useCallback, useEffect, useRef, useState } from 'react';
import { getArcadeSocket } from '@/lib/arcadeSocket';
import type {
  ChessStatePayload,
  ChessMoveAppliedPayload,
  ChessMoveRejectedPayload,
  ChessRoundEndPayload,
  ChessMatchEndPayload,
  ChessDrawOfferedPayload,
  ChessOpponentDisconnectedPayload,
} from '@/lib/types';

interface UseChessSocketOptions {
  roomId: string;
  onMatchEnd?: (payload: ChessMatchEndPayload) => void;
}

export interface ChessLastMove {
  from: string;
  to: string;
}

/** Same shape as useWordBombSocket/useSnakeRoyaleSocket: register listeners, then
 *  `game:resume` (never before — see the interface doc on GameEngine.getResumeEvents), expose
 *  emitters. `chess:state` and `chess:round:start` share one handler since both carry the
 *  engine's full canonical snapshot; `chess:move:applied` patches that snapshot incrementally
 *  rather than waiting for a full resync on every move. */
export function useChessSocket({ roomId, onMatchEnd }: UseChessSocketOptions) {
  const [state, setState] = useState<ChessStatePayload | null>(null);
  const [lastMove, setLastMove] = useState<ChessLastMove | null>(null);
  const [rejection, setRejection] = useState<ChessMoveRejectedPayload | null>(null);
  const [roundEnd, setRoundEnd] = useState<ChessRoundEndPayload | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState<ChessOpponentDisconnectedPayload | null>(null);
  const onMatchEndRef = useRef(onMatchEnd);
  onMatchEndRef.current = onMatchEnd;

  useEffect(() => {
    const socket = getArcadeSocket();
    if (!socket) return;

    const onState = (payload: ChessStatePayload) => {
      if (payload.roomId !== roomId) return;
      setState(payload);
      setRoundEnd(null);
      setLastMove(null);
      setOpponentDisconnected(null);
      setRejection(null);
    };
    const onMoveApplied = (payload: ChessMoveAppliedPayload) => {
      if (payload.roomId !== roomId) return;
      setLastMove({ from: payload.move.from, to: payload.move.to });
      setRejection(null);
      setState((prev) =>
        prev
          ? {
              ...prev,
              fen: payload.fen,
              turn: payload.turn,
              clocks: payload.clocks,
              inCheck: payload.inCheck,
              moveHistory: [...prev.moveHistory, payload.move.san],
              drawOfferBy: null,
            }
          : prev,
      );
    };
    const onMoveRejected = (payload: ChessMoveRejectedPayload) => {
      if (payload.roomId !== roomId) return;
      setRejection(payload);
    };
    const onRoundEnd = (payload: ChessRoundEndPayload) => {
      if (payload.roomId !== roomId) return;
      setRoundEnd(payload);
    };
    const onMatchEndEvent = (payload: ChessMatchEndPayload) => {
      if (payload.roomId !== roomId) return;
      onMatchEndRef.current?.(payload);
    };
    const onDrawOffered = (payload: ChessDrawOfferedPayload) => {
      if (payload.roomId !== roomId) return;
      setState((prev) => (prev ? { ...prev, drawOfferBy: payload.seat } : prev));
    };
    const onDrawDeclined = (payload: { roomId: string }) => {
      if (payload.roomId !== roomId) return;
      setState((prev) => (prev ? { ...prev, drawOfferBy: null } : prev));
    };
    const onOpponentDisconnected = (payload: ChessOpponentDisconnectedPayload) => {
      if (payload.roomId !== roomId) return;
      setOpponentDisconnected(payload);
    };
    const onOpponentReconnected = (payload: { roomId: string }) => {
      if (payload.roomId !== roomId) return;
      setOpponentDisconnected(null);
    };

    socket.on('chess:state', onState);
    socket.on('chess:round:start', onState);
    socket.on('chess:move:applied', onMoveApplied);
    socket.on('chess:move:rejected', onMoveRejected);
    socket.on('chess:round:end', onRoundEnd);
    socket.on('chess:match:end', onMatchEndEvent);
    socket.on('chess:draw:offered', onDrawOffered);
    socket.on('chess:draw:declined', onDrawDeclined);
    socket.on('chess:opponent:disconnected', onOpponentDisconnected);
    socket.on('chess:opponent:reconnected', onOpponentReconnected);
    // Must come after every socket.on() above — see useWordBombSocket.ts for why ordering
    // matters (covers both a mount-race against the engine's first broadcast and a refresh).
    socket.emit('game:resume', { roomId });

    return () => {
      socket.off('chess:state', onState);
      socket.off('chess:round:start', onState);
      socket.off('chess:move:applied', onMoveApplied);
      socket.off('chess:move:rejected', onMoveRejected);
      socket.off('chess:round:end', onRoundEnd);
      socket.off('chess:match:end', onMatchEndEvent);
      socket.off('chess:draw:offered', onDrawOffered);
      socket.off('chess:draw:declined', onDrawDeclined);
      socket.off('chess:opponent:disconnected', onOpponentDisconnected);
      socket.off('chess:opponent:reconnected', onOpponentReconnected);
    };
  }, [roomId]);

  const move = useCallback(
    (from: string, to: string, promotion?: string) => {
      getArcadeSocket()?.emit('chess:move', { roomId, from, to, promotion });
    },
    [roomId],
  );
  const resign = useCallback(() => {
    getArcadeSocket()?.emit('chess:resign', { roomId });
  }, [roomId]);
  const offerDraw = useCallback(() => {
    getArcadeSocket()?.emit('chess:offer-draw', { roomId });
  }, [roomId]);
  const respondDraw = useCallback(
    (accept: boolean) => {
      getArcadeSocket()?.emit('chess:respond-draw', { roomId, accept });
    },
    [roomId],
  );

  return { state, lastMove, rejection, roundEnd, opponentDisconnected, move, resign, offerDraw, respondDraw };
}
