import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trophy, History as HistoryIcon, Gamepad2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { RoomCard } from './components/RoomCard';
import { CreateRoomDialog } from './components/CreateRoomDialog';
import type { GameRoomSummary } from '@/lib/types';

export function ArcadeHub() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['arcade-rooms'],
    queryFn: () => api.get<GameRoomSummary[]>('/arcade/rooms').then((res) => res.data),
    refetchInterval: 15000,
  });

  const requestMutation = useMutation({
    mutationFn: (roomId: string) => api.post(`/arcade/rooms/${roomId}/request`),
    onSuccess: (_data, roomId) => {
      queryClient.invalidateQueries({ queryKey: ['arcade-rooms'] });
      navigate(`/arcade/rooms/${roomId}`);
    },
    meta: { errorTitle: 'Could not request to join' },
  });

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2">Arcade</h1>
          <p className="text-ink-500">Spin up a game, invite the team, and see who comes out on top.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/arcade/history')}>
            <HistoryIcon size={16} />
            History
          </Button>
          <Button variant="secondary" onClick={() => navigate('/arcade/leaderboard')}>
            <Trophy size={16} />
            Leaderboard
          </Button>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            New Room
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-ink-200 py-20 text-center">
          <Gamepad2 size={28} className="text-brass-500" />
          <h2 className="text-xl">No games running right now</h2>
          <p className="max-w-sm text-sm text-ink-500">
            Start a room, invite the team, and take a break together — or play solo against the machine.
          </p>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            New Room
          </Button>
        </div>
      ) : (
        <div className="animate-fade-up grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onOpen={() => navigate(`/arcade/rooms/${room.id}`)}
              onRequestJoin={() => requestMutation.mutate(room.id)}
              requesting={requestMutation.isPending && requestMutation.variables === room.id}
            />
          ))}
        </div>
      )}

      <CreateRoomDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
