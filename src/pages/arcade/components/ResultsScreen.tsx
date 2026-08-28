import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { Trophy, ArrowLeft, RotateCcw, Bot } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { getInitials } from '@/components/ui/Avatar';
import { seatColor } from '@/lib/arcade/playerColors';
import { GAME_META } from '@/lib/arcade/gameMeta';
import { motionTransition, springs } from '@/lib/motion/springs';
import { cn } from '@/lib/utils';
import type { GameRoomDetail, GameRoomResult } from '@/lib/types';

interface ResultsScreenProps {
  room: GameRoomDetail;
  isHost: boolean;
  onPlayAgain: () => void;
  onBackToHub: () => void;
  playAgainPending?: boolean;
}

export function ResultsScreen({ room, isHost, onPlayAgain, onBackToHub, playAgainPending }: ResultsScreenProps) {
  const reduce = !!useReducedMotion();
  const { data: result, isLoading } = useQuery({
    queryKey: ['arcade-room-result', room.id],
    queryFn: () => api.get<GameRoomResult | null>(`/arcade/rooms/${room.id}/result`).then((res) => res.data),
  });

  if (isLoading || !result) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-12">
        <Skeleton className="mx-auto h-9 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const winners = result.players.filter((p) => p.won);
  const headline =
    winners.length === 0
      ? 'Match complete'
      : winners.length === 1
        ? `${winners[0].displayName} wins!`
        : `${winners.map((w) => w.displayName).join(' & ')} win!`;

  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={motionTransition(reduce, springs.snappy)}
      >
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brass-600">
          {GAME_META[result.gameType].label} · Best of {room.roundsTotal}
        </p>
        <h1 className="mb-8">{headline}</h1>

        <div className="space-y-2 rounded-lg border border-ink-200 bg-bone-100 p-2 text-left">
          {result.players.map((player, i) => {
            const colors = seatColor(i);
            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={motionTransition(reduce, { ...springs.snappy, delay: reduce ? 0 : i * 0.05 })}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5',
                  player.placement === 1 && 'bg-brass-50',
                )}
              >
                <span className="w-5 flex-shrink-0 text-center text-sm font-semibold tabular-nums text-ink-400">
                  {player.placement ?? '—'}
                </span>
                <div
                  className={cn(
                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-medium text-bone-50',
                    colors.bg,
                  )}
                >
                  {player.isBot ? <Bot size={14} /> : getInitials(player.displayName)}
                </div>
                <span className="flex-1 truncate text-sm font-medium text-ink-900">{player.displayName}</span>
                {player.placement === 1 && <Trophy size={14} className="flex-shrink-0 text-brass-500" />}
                <span className="flex-shrink-0 text-xs tabular-nums text-ink-400">
                  {player.roundsWon} round{player.roundsWon === 1 ? '' : 's'}
                </span>
                <span className="w-10 flex-shrink-0 text-right text-sm font-semibold tabular-nums text-ink-900">
                  {player.score}
                </span>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center gap-3">
          <Button variant="secondary" onClick={onBackToHub}>
            <ArrowLeft size={16} />
            Back to Arcade
          </Button>
          {isHost && (
            <Button variant="primary" onClick={onPlayAgain} disabled={playAgainPending}>
              <RotateCcw size={16} />
              {playAgainPending ? 'Starting…' : 'Play again'}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
