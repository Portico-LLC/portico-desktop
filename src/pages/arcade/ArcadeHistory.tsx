import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, History as HistoryIcon, Bot, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Badge } from '@/components/ui/Badge';
import { seatColor } from '@/lib/arcade/playerColors';
import { GAME_META } from '@/lib/arcade/gameMeta';
import { cn } from '@/lib/utils';
import type { GameMatchHistoryEntry, GameType } from '@/lib/types';

const FILTERS: { id: GameType | 'all'; label: string }[] = [
  { id: 'all', label: 'All games' },
  { id: 'word_bomb', label: GAME_META.word_bomb.label },
  { id: 'snake_royale', label: GAME_META.snake_royale.label },
  { id: 'doodle_relay', label: GAME_META.doodle_relay.label },
];

function formatDuration(startedAt?: string, endedAt?: string): string {
  if (!startedAt || !endedAt) return '';
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const minutes = Math.max(1, Math.round(ms / 60000));
  return `${minutes} min`;
}

export function ArcadeHistory() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<GameType | 'all'>('all');

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['arcade-history', filter],
    queryFn: () =>
      api
        .get<GameMatchHistoryEntry[]>('/arcade/history', { params: filter === 'all' ? undefined : { gameType: filter } })
        .then((res) => res.data),
  });

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/arcade')}>
          <ArrowLeft size={18} />
        </Button>
        <h1>Match history</h1>
      </div>

      <div className="mb-6 max-w-md">
        <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-ink-200 py-20 text-center">
          <HistoryIcon size={28} className="text-brass-500" />
          <h2 className="text-xl">No matches yet</h2>
          <p className="max-w-sm text-sm text-ink-500">Finished matches show up here, win or lose.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => {
            const meta = GAME_META[match.gameType];
            return (
              <Card key={match.id} className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-pine-100 text-pine-700">
                  {meta.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink-900">{meta.label}</p>
                    {match.isSoloPractice && <Badge variant="outline">Solo practice</Badge>}
                    <span className="text-xs text-ink-400">
                      {match.roundsPlayed} round{match.roundsPlayed === 1 ? '' : 's'} · {formatDuration(match.startedAt, match.endedAt)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {match.players.map((player, i) => (
                      <span
                        key={player.id}
                        className={cn(
                          'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                          player.won ? 'font-semibold text-ink-900' : 'text-ink-400',
                          seatColor(i).soft,
                        )}
                      >
                        {player.isBot && <Bot size={10} />}
                        {player.displayName}
                        {player.won && <Trophy size={10} className="text-brass-500" />}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right text-xs text-ink-400">
                  {new Date(match.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
