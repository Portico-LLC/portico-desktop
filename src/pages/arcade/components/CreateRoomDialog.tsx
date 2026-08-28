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

const GAME_ORDER: GameType[] = ['word_bomb', 'snake_royale', 'doodle_relay'];

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

  const createMutation = useMutation({
    mutationFn: () =>
      api
        .post<GameRoomDetail>('/arcade/rooms', { gameType, roundsTotal, maxPlayers, visibility, fillWithBots })
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
            <div className="grid grid-cols-3 gap-2">
              {GAME_ORDER.map((type) => {
                const meta = GAME_META[type];
                const selected = gameType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={!meta.available}
                    onClick={() => setGameType(type)}
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Max players</Label>
              <span className="text-sm font-medium tabular-nums text-ink-700">{maxPlayers}</span>
            </div>
            <Slider min={2} max={8} step={1} value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} />
          </div>

          <div className="flex items-center justify-between rounded-md border border-ink-200 p-3">
            <div>
              <p className="text-sm font-medium text-ink-900">Fill empty seats with bots</p>
              <p className="text-xs text-ink-400">Lets you (or anyone) play solo against the machine.</p>
            </div>
            <Switch checked={fillWithBots} onCheckedChange={setFillWithBots} />
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
