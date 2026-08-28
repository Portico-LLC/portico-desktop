import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bot, Pencil, Trophy } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { CountdownRing } from '../../components/CountdownRing';
import { SEAT_COLOR_VARS } from '@/lib/arcade/playerColors';
import { motionTransition, springs } from '@/lib/motion/springs';
import { cn } from '@/lib/utils';
import { DoodleCanvas, type DoodleCanvasHandle } from './DoodleCanvas';
import { GuessPanel } from './GuessPanel';
import { useDoodleRelaySocket } from './useDoodleRelaySocket';
import type { GameRoomDetail, GameRoomMemberType, DoodleStrokePayload, DoodleMatchEndPayload, NormalizedPoint, DoodleTool } from '@/lib/types';

interface DoodleRelayStageProps {
  room: GameRoomDetail;
  onMatchEnd: (payload: DoodleMatchEndPayload) => void;
}

interface SeatScore {
  score: number;
  roundsWon: number;
}

export function DoodleRelayStage({ room, onMatchEnd }: DoodleRelayStageProps) {
  const reduce = !!useReducedMotion();
  const authUser = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const canvasRef = useRef<DoodleCanvasHandle>(null);
  // Strokes I originated echo back over the room broadcast (I'm a member of my own room) —
  // this tracks "already drawn locally" so I don't draw my own line twice.
  const myStrokeIdsRef = useRef<Set<string>>(new Set());

  const myMemberType: GameRoomMemberType = role === 'employee' ? 'employee' : 'owner';
  const mySeatIndex = room.members.find((m) => m.memberType === myMemberType && m.memberId === authUser?.id)?.seatIndex ?? null;

  const { roundStart, myWord, reveal, guessFeed, myLastResult, sendStroke, sendClear, sendGuess } = useDoodleRelaySocket({
    roomId: room.id,
    mySeatIndex,
    onStroke: (payload: DoodleStrokePayload) => {
      if (myStrokeIdsRef.current.has(payload.strokeId)) {
        if (payload.phase === 'end') myStrokeIdsRef.current.delete(payload.strokeId);
        return;
      }
      canvasRef.current?.drawRemoteStroke(payload);
    },
    onClear: () => canvasRef.current?.clear(),
    onMatchEnd,
  });

  const [scoresBySeat, setScoresBySeat] = useState<Map<number, SeatScore>>(new Map());
  useEffect(() => {
    if (reveal) setScoresBySeat(new Map(reveal.scores.map((s) => [s.seat, s])));
  }, [reveal]);

  const isArtist = roundStart !== null && roundStart.artistSeat === mySeatIndex;
  const alreadyCorrect = myLastResult?.correct === true;

  const seatEntries = [...room.members].filter((m) => m.seatIndex !== null).sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0));
  const seatName = (seat: number) => (seat === mySeatIndex ? 'You' : seatEntries.find((s) => s.seatIndex === seat)?.displayName ?? 'Someone');

  const handleLocalStroke = (payload: { strokeId: string; phase: 'start' | 'move' | 'end'; point?: NormalizedPoint; color?: string; width?: number; tool?: DoodleTool }) => {
    if (payload.phase === 'start') myStrokeIdsRef.current.add(payload.strokeId);
    sendStroke(payload);
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 py-6">
      <div className="flex flex-wrap justify-center gap-3">
        {seatEntries.map((member) => {
          const seatIndex = member.seatIndex ?? 0;
          const stat = scoresBySeat.get(seatIndex);
          const isCurrentArtist = roundStart?.artistSeat === seatIndex;
          const isMine = seatIndex === mySeatIndex;
          return (
            <div
              key={member.id}
              className={cn(
                'flex items-center gap-2 rounded-full border py-1 pl-1 pr-3',
                isCurrentArtist ? 'border-brass-400 bg-brass-50' : 'border-ink-200 bg-bone-100',
              )}
            >
              <span
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-bone-50"
                style={{ backgroundColor: `var(${SEAT_COLOR_VARS[seatIndex % SEAT_COLOR_VARS.length]})` }}
              >
                {isCurrentArtist && <Pencil size={11} />}
              </span>
              <span className="text-xs font-medium text-ink-900">{isMine ? 'You' : member.displayName}</span>
              {member.isBot && <Bot size={11} className="text-ink-400" />}
              <span className="text-[11px] tabular-nums text-ink-500">{stat?.score ?? 0}</span>
            </div>
          );
        })}
      </div>

      {roundStart && (
        <div className="flex items-center justify-center gap-3">
          <p className="text-sm text-ink-500">
            Round {roundStart.roundNumber} — <span className="font-medium text-ink-800">{seatName(roundStart.artistSeat)}</span> is drawing
          </p>
          <CountdownRing deadlineAt={roundStart.deadlineAt} durationMs={roundStart.durationMs} size={40} />
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="relative flex-1">
          <DoodleCanvas ref={canvasRef} interactive={isArtist} onLocalStroke={handleLocalStroke} onLocalClear={sendClear} />

          <AnimatePresence>
            {reveal && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={motionTransition(reduce, springs.snappy)}
                className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-ink-950/60"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-bone-200">The word was</p>
                <p className="font-display text-3xl text-bone-50">{reveal.word}</p>
                {reveal.winnerSeat !== null && (
                  <p className="flex items-center gap-1.5 text-sm text-brass-300">
                    <Trophy size={14} />
                    {seatName(reveal.winnerSeat)} scored the most this round
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full lg:w-72">
          <GuessPanel
            isArtist={isArtist}
            wordLength={roundStart?.wordLength ?? 0}
            myWord={myWord}
            guessFeed={guessFeed}
            seatName={seatName}
            onGuess={sendGuess}
            alreadyCorrect={alreadyCorrect}
            lastWasWrong={myLastResult?.correct === false}
          />
        </div>
      </div>
    </div>
  );
}
