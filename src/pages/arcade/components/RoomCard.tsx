import { Users, Lock, Crown, Bot } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { GAME_META } from '@/lib/arcade/gameMeta';
import type { GameRoomSummary } from '@/lib/types';

const STATUS_BADGE: Record<GameRoomSummary['status'], { label: string; variant: 'neutral' | 'moss' | 'ochre' | 'brass' }> = {
  lobby: { label: 'In lobby', variant: 'brass' },
  starting: { label: 'Starting…', variant: 'ochre' },
  in_progress: { label: 'In progress', variant: 'moss' },
  finished: { label: 'Finished', variant: 'neutral' },
  abandoned: { label: 'Closed', variant: 'neutral' },
};

interface RoomCardProps {
  room: GameRoomSummary;
  onOpen: () => void;
  onRequestJoin: () => void;
  requesting?: boolean;
}

export function RoomCard({ room, onOpen, onRequestJoin, requesting }: RoomCardProps) {
  const meta = GAME_META[room.gameType];
  const status = STATUS_BADGE[room.status];
  const canRequest = room.status === 'lobby' && room.visibility === 'open' && !room.myStatus && !room.isHost;

  return (
    <Card className="flex cursor-pointer flex-col gap-4 p-5" onClick={onOpen}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-pine-100 text-pine-700">
            {meta.icon}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-900">{meta.label}</p>
            <p className="truncate text-xs text-ink-400">Hosted by {room.hostName}</p>
          </div>
        </div>
        {room.visibility === 'invite_only' && <Lock size={14} className="mt-1 flex-shrink-0 text-ink-400" />}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={status.variant} dot={room.status === 'in_progress'}>
          {status.label}
        </Badge>
        <Badge variant="outline">
          <Users size={11} />
          {room.activeCount}/{room.maxPlayers}
        </Badge>
        <Badge variant="outline">Best of {room.roundsTotal}</Badge>
        {room.fillWithBots && (
          <Badge variant="outline">
            <Bot size={11} />
            Bots fill in
          </Badge>
        )}
        {room.isHost && (
          <Badge variant="brass">
            <Crown size={11} />
            Hosting
          </Badge>
        )}
      </div>

      {canRequest && (
        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={(e) => {
            e.stopPropagation();
            onRequestJoin();
          }}
          disabled={requesting}
        >
          {requesting ? 'Requesting…' : 'Request to join'}
        </Button>
      )}
    </Card>
  );
}
