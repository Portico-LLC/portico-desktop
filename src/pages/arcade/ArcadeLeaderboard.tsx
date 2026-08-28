import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { getInitials } from '@/components/ui/Avatar';
import { seatColor } from '@/lib/arcade/playerColors';
import { GAME_META } from '@/lib/arcade/gameMeta';
import { cn } from '@/lib/utils';
import type { ArcadeLeaderboardRow, GameType } from '@/lib/types';

const FILTERS: { id: GameType | 'all'; label: string }[] = [
  { id: 'all', label: 'All games' },
  { id: 'word_bomb', label: GAME_META.word_bomb.label },
  { id: 'snake_royale', label: GAME_META.snake_royale.label },
  { id: 'doodle_relay', label: GAME_META.doodle_relay.label },
];

export function ArcadeLeaderboard() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<GameType | 'all'>('all');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['arcade-leaderboard', filter],
    queryFn: () =>
      api
        .get<ArcadeLeaderboardRow[]>('/arcade/leaderboard', { params: filter === 'all' ? undefined : { gameType: filter } })
        .then((res) => res.data),
  });

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/arcade')}>
          <ArrowLeft size={18} />
        </Button>
        <h1>Leaderboard</h1>
      </div>

      <div className="mb-6 max-w-md">
        <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-ink-200 py-20 text-center">
          <Trophy size={28} className="text-brass-500" />
          <h2 className="text-xl">No matches yet</h2>
          <p className="max-w-sm text-sm text-ink-500">
            Play a full match with another teammate to appear here — solo practice doesn't count.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-ink-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 bg-bone-100 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3 text-right">Wins</th>
                <th className="px-4 py-3 text-right">Matches</th>
                <th className="px-4 py-3 text-right">Rounds won</th>
                <th className="px-4 py-3 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {rows.map((row, i) => {
                const colors = seatColor(i);
                return (
                  <tr key={`${row.memberType}:${row.memberId}`} className="transition-colors duration-hover ease-brand hover:bg-ink-50">
                    <td className="px-4 py-3 tabular-nums text-ink-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium text-bone-50',
                            colors.bg,
                          )}
                        >
                          {getInitials(row.displayName)}
                        </div>
                        <span className="font-medium text-ink-900">{row.displayName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-900">{row.wins}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-500">{row.matchesPlayed}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-500">{row.totalRoundsWon}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-500">{row.totalScore}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
