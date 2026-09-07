import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { GameRoomDetail, GameType, GameRoomVisibility } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { GAME_META } from '@/lib/arcade/gameMeta';
import { cn } from '@/lib/utils';

const GAME_ORDER: GameType[] = ['word_bomb', 'snake_royale', 'doodle_relay', 'chess'];

// Mirrors the 6 presets resolved server-side in chess.types.ts — the standard Lichess/
// Chess.com time-control brackets. Only the id crosses the wire (in `settings.timeControl`);
// the server owns the actual base/increment milliseconds.
type ChessTimeControlId = 'bullet_1_0' | 'bullet_2_1' | 'blitz_3_0' | 'blitz_5_0' | 'rapid_10_0' | 'classical_30_0';
const CHESS_TIME_CONTROLS: { id: ChessTimeControlId; label: string }[] = [
  { id: 'bullet_1_0', label: 'Bullet · 1 min' },
  { id: 'bullet_2_1', label: 'Bullet · 2 min + 1s' },
  { id: 'blitz_3_0', label: 'Blitz · 3 min' },
  { id: 'blitz_5_0', label: 'Blitz · 5 min' },
  { id: 'rapid_10_0', label: 'Rapid · 10 min' },
  { id: 'classical_30_0', label: 'Classical · 30 min' },
];

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRoomDialog({ open, onOpenChange }: CreateRoomDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [gameType, setGameType] = useState<GameType>('word_bomb');
  const [roundsTotal, setRoundsTotal] = useState(3);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [visibility, setVisibility] = useState<GameRoomVisibility>('open');
  const [fillWithBots, setFillWithBots] = useState(true);
  const [chessTimeControl, setChessTimeControl] = useState<ChessTimeControlId>('rapid_10_0');
  const [chessBotDifficulty, setChessBotDifficulty] = useState(3);
  const isChess = gameType === 'chess';

  const createMutation = useMutation({
    mutationFn: () =>
      api
        .post<GameRoomDetail>('/arcade/rooms', {
          gameType,
          roundsTotal,
          maxPlayers: isChess ? 2 : maxPlayers,
          visibility,
          fillWithBots,
          ...(isChess ? { settings: { timeControl: chessTimeControl, botDifficulty: chessBotDifficulty } } : {}),
        })
        .then((res) => res.data),
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ['arcade-rooms'] });
      onOpenChange(false);
      navigate(`/arcade/rooms/${room.id}`);
    },
    meta: { errorTitle: 'Could not create room' },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New game room</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Game</Label>
            <div className="grid grid-cols-4 gap-2">
              {GAME_ORDER.map((type) => {
                const meta = GAME_META[type];
                const selected = gameType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={!meta.available}
                    onClick={() => {
                      setGameType(type);
                      if (type === 'chess') setMaxPlayers(2);
                    }}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-md border p-3 text-center transition-all duration-hover ease-brand',
                      selected
                        ? 'border-brass-500 bg-brass-50 ring-2 ring-brass-200'
                        : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50',
                      !meta.available && 'cursor-not-allowed opacity-40 hover:border-ink-200 hover:bg-transparent',
                    )}
                  >
                    <span className={cn('text-ink-700', selected && 'text-brass-700')}>{meta.icon}</span>
                    <span className="text-xs font-medium text-ink-900">{meta.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-ink-400">{GAME_META[gameType].tagline}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Rounds</Label>
              <span className="text-sm font-medium tabular-nums text-ink-700">Best of {roundsTotal}</span>
            </div>
            <Slider min={1} max={9} step={2} value={roundsTotal} onChange={(e) => setRoundsTotal(Number(e.target.value))} />
          </div>

          {isChess ? (
            <div className="space-y-2">
              <Label>Time control</Label>
              <div className="grid grid-cols-3 gap-2">
                {CHESS_TIME_CONTROLS.map((tc) => (
                  <button
                    key={tc.id}
                    type="button"
                    onClick={() => setChessTimeControl(tc.id)}
                    className={cn(
                      'rounded-md border px-2 py-2 text-xs font-medium transition-colors duration-hover ease-brand',
                      chessTimeControl === tc.id
                        ? 'border-brass-500 bg-brass-50 text-brass-800'
                        : 'border-ink-200 text-ink-700 hover:border-ink-300 hover:bg-ink-50',
                    )}
                  >
                    {tc.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Max players</Label>
                <span className="text-sm font-medium tabular-nums text-ink-700">{maxPlayers}</span>
              </div>
              <Slider min={2} max={8} step={1} value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} />
            </div>
          )}

          <div className="space-y-3 rounded-md border border-ink-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-900">{isChess ? 'Play against a bot' : 'Fill empty seats with bots'}</p>
                <p className="text-xs text-ink-400">
                  {isChess ? "No one else joins? You'll play the bot instead." : 'Lets you (or anyone) play solo against the machine.'}
                </p>
              </div>
              <Switch checked={fillWithBots} onCheckedChange={setFillWithBots} />
            </div>
            {isChess && fillWithBots && (
              <div className="space-y-1.5 border-t border-ink-100 pt-3">
                <div className="flex items-center justify-between">
                  <Label>Bot difficulty</Label>
                  <span className="text-sm font-medium tabular-nums text-ink-700">{chessBotDifficulty} / 5</span>
                </div>
                <Slider min={1} max={5} step={1} value={chessBotDifficulty} onChange={(e) => setChessBotDifficulty(Number(e.target.value))} />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Who can join</Label>
            <SegmentedControl
              options={[
                { id: 'open', label: 'Open — anyone can request' },
                { id: 'invite_only', label: 'Invite only' },
              ]}
              value={visibility}
              onChange={setVisibility}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create room'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
