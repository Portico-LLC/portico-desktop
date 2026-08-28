import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useAnimation, useReducedMotion } from 'framer-motion';
import { Bot, Heart, Send } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { getInitials } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { seatColor } from '@/lib/arcade/playerColors';
import { motionTransition, springs } from '@/lib/motion/springs';
import { cn } from '@/lib/utils';
import { CountdownRing } from '../../components/CountdownRing';
import { useWordBombSocket } from './useWordBombSocket';
import type { GameRoomDetail, GameRoomMemberType, WordBombMatchEndPayload } from '@/lib/types';

interface WordBombStageProps {
  room: GameRoomDetail;
  onMatchEnd: (payload: WordBombMatchEndPayload) => void;
}

interface FeedEntry {
  key: number;
  word: string;
  seat: number;
}

export function WordBombStage({ room, onMatchEnd }: WordBombStageProps) {
  const reduce = !!useReducedMotion();
  const authUser = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const inputRef = useRef<HTMLInputElement>(null);
  const shakeControls = useAnimation();
  const feedKey = useRef(0);

  const myMemberType: GameRoomMemberType = role === 'employee' ? 'employee' : 'owner';
  const mySeatIndex =
    room.members.find((m) => m.memberType === myMemberType && m.memberId === authUser?.id)?.seatIndex ?? null;

  const { turn, lastResult, roundEnd, submit } = useWordBombSocket({ roomId: room.id, onMatchEnd });
  const [value, setValue] = useState('');
  const [feed, setFeed] = useState<FeedEntry[]>([]);

  const seats = [...room.members].filter((m) => m.seatIndex !== null).sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0));
  const isMyTurn = turn?.activeSeat === mySeatIndex;
  const livesBySeat = new Map((turn?.players ?? []).map((p) => [p.seat, p]));

  useEffect(() => {
    if (!lastResult) return;
    if (lastResult.accepted) {
      setValue('');
      setFeed((f) => [{ word: lastResult.word, seat: lastResult.seat, key: feedKey.current++ }, ...f].slice(0, 8));
    } else if (lastResult.seat === mySeatIndex) {
      void shakeControls.start({ x: [0, -8, 8, -8, 8, 0], transition: { duration: 0.4 } });
    }
    // shakeControls is stable across renders (framer-motion memoizes it) — omitting it from
    // deps would be equally correct but including it is harmless and keeps the linter happy.
  }, [lastResult, mySeatIndex, shakeControls]);

  useEffect(() => {
    if (isMyTurn) inputRef.current?.focus();
  }, [isMyTurn]);

  const handleSubmit = () => {
    if (!value.trim() || !isMyTurn) return;
    submit(value.trim());
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 py-6">
      <div className="flex flex-wrap justify-center gap-3">
        {seats.map((member) => {
          const seatIndex = member.seatIndex ?? 0;
          const colors = seatColor(seatIndex);
          const liveState = livesBySeat.get(seatIndex);
          const alive = liveState?.alive ?? true;
          const active = turn?.activeSeat === seatIndex;
          return (
            <div key={member.id} className="relative flex flex-col items-center gap-1.5">
              {active && (
                <motion.div
                  layoutId="wordbomb-active-ring"
                  transition={motionTransition(reduce, springs.snappy)}
                  className="pointer-events-none absolute -inset-1.5 rounded-full ring-2 ring-brass-500"
                />
              )}
              <div
                className={cn(
                  'relative flex h-12 w-12 items-center justify-center rounded-full text-xs font-medium text-bone-50 transition-opacity duration-transition ease-brand',
                  colors.bg,
                  !alive && 'opacity-30 grayscale',
                )}
              >
                {member.isBot ? <Bot size={18} /> : getInitials(member.displayName)}
              </div>
              <p className={cn('max-w-[64px] truncate text-[11px] font-medium', alive ? 'text-ink-700' : 'text-ink-400')}>
                {member.displayName}
              </p>
              <div className="flex gap-0.5">
                {Array.from({ length: liveState?.lives ?? 0 }).map((_, i) => (
                  <Heart key={i} size={9} className="fill-terracotta-500 text-terracotta-500" />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {roundEnd && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={motionTransition(reduce, springs.snappy)}
            className="rounded-md border border-brass-300 bg-brass-50 px-4 py-2 text-sm font-medium text-brass-800"
          >
            {roundEnd.winnerSeat !== null
              ? `${seats.find((s) => s.seatIndex === roundEnd.winnerSeat)?.displayName ?? 'A player'} won round ${roundEnd.roundNumber}`
              : `Round ${roundEnd.roundNumber} ended`}
            {' — next round starting…'}
          </motion.div>
        )}
      </AnimatePresence>

      {turn && !roundEnd && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-ink-400">
            {isMyTurn ? "It's your turn" : `Waiting for ${seats.find((s) => s.seatIndex === turn.activeSeat)?.displayName ?? '…'}`}
          </p>
          <div className="flex items-center gap-5">
            <motion.h1
              key={`${turn.activeSeat}-${turn.deadlineAt}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={motionTransition(reduce, springs.snappy)}
              className="font-mono text-5xl uppercase tracking-widest text-ink-900"
            >
              {turn.prompt}
            </motion.h1>
            <CountdownRing deadlineAt={turn.deadlineAt} durationMs={turn.fuseMs} />
          </div>

          <motion.div animate={shakeControls} className="w-full max-w-sm">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder={isMyTurn ? `A word containing "${turn.prompt}"…` : 'Not your turn'}
                disabled={!isMyTurn}
                autoComplete="off"
              />
              <Button variant="primary" onClick={handleSubmit} disabled={!isMyTurn || !value.trim()}>
                <Send size={16} />
              </Button>
            </div>
            {lastResult && !lastResult.accepted && lastResult.seat === mySeatIndex && (
              <p className="mt-1.5 text-xs text-terracotta-600">
                {lastResult.reason === 'not_a_word' && "That's not in the word list."}
                {lastResult.reason === 'already_used' && 'Already used this round.'}
                {lastResult.reason === 'missing_substring' && `Needs to contain "${turn.prompt}".`}
                {lastResult.reason === 'empty' && 'Type something first.'}
              </p>
            )}
          </motion.div>
        </div>
      )}

      {feed.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          <AnimatePresence initial={false}>
            {feed.map((entry) => (
              <motion.span
                key={entry.key}
                initial={{ opacity: 0, y: 6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={motionTransition(reduce, springs.snappy)}
                className={cn('rounded-full px-2.5 py-1 text-xs font-medium text-ink-800', seatColor(entry.seat).soft)}
              >
                {entry.word}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
