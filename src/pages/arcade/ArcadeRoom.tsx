import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Play, LogOut, Settings2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { getArcadeSocket } from '@/lib/arcadeSocket';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { GAME_META } from '@/lib/arcade/gameMeta';
import { LobbySeatGrid } from './components/LobbySeatGrid';
import { InvitePickerDialog } from './components/InvitePickerDialog';
import { ResultsScreen } from './components/ResultsScreen';
import { WordBombStage } from './games/word-bomb/WordBombStage';
import { SnakeRoyaleBoard } from './games/snake-royale/SnakeRoyaleBoard';
import { DoodleRelayStage } from './games/doodle-relay/DoodleRelayStage';
import type { GameRoomDetail, GameRoomMember, GameRoomMemberType, RoomStartingPayload } from '@/lib/types';

export function ArcadeRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<string | undefined>();

  const roomQuery = useQuery({
    queryKey: ['arcade-room', roomId],
    queryFn: () => api.get<GameRoomDetail>(`/arcade/rooms/${roomId}`).then((res) => res.data),
    enabled: !!roomId,
    retry: false,
    refetchInterval: (query) => (query.state.data?.status === 'in_progress' ? false : 8000),
  });
  const room = roomQuery.data;

  useEffect(() => {
    if (!roomId) return;
    const socket = getArcadeSocket();
    if (!socket) return;
    const refetch = () => queryClient.invalidateQueries({ queryKey: ['arcade-room', roomId] });
    const join = () => socket.emit('room:join', { roomId });
    const onStarting = (payload: RoomStartingPayload) => {
      if (payload.roomId !== roomId) return;
      setStartsAt(payload.startsAt);
      refetch();
    };
    const onStarted = () => {
      setStartsAt(null);
      refetch();
    };

    join();
    socket.on('connect', join);
    socket.on('room:updated', refetch);
    socket.on('room:starting', onStarting);
    socket.on('room:started', onStarted);
    return () => {
      socket.emit('room:leave', { roomId });
      socket.off('connect', join);
      socket.off('room:updated', refetch);
      socket.off('room:starting', onStarting);
      socket.off('room:started', onStarted);
    };
  }, [roomId, queryClient]);

  const myMemberType: GameRoomMemberType = role === 'employee' ? 'employee' : 'owner';
  const isMe = (member: GameRoomMember) => member.memberType === myMemberType && member.memberId === authUser?.id;
  const isHost = !!room?.members.some((m) => m.isHost && isMe(m));

  const mutateAndRefetch = (fn: () => Promise<unknown>) =>
    fn().then(() => queryClient.invalidateQueries({ queryKey: ['arcade-room', roomId] }));

  const requestJoinMutation = useMutation({
    mutationFn: () => mutateAndRefetch(() => api.post(`/arcade/rooms/${roomId}/request`)),
    meta: { errorTitle: 'Could not request to join' },
  });

  const kickMutation = useMutation({
    mutationFn: (member: GameRoomMember) => {
      setBusyMemberId(member.id);
      return mutateAndRefetch(() => api.post(`/arcade/rooms/${roomId}/kick`, { type: member.memberType, id: member.memberId }));
    },
    onSettled: () => setBusyMemberId(undefined),
    meta: { errorTitle: 'Could not remove player' },
  });

  const approveMutation = useMutation({
    mutationFn: (member: GameRoomMember) => {
      setBusyMemberId(member.id);
      return mutateAndRefetch(() => api.post(`/arcade/rooms/${roomId}/approve`, { type: member.memberType, id: member.memberId }));
    },
    onSettled: () => setBusyMemberId(undefined),
    meta: { errorTitle: 'Could not approve player' },
  });

  const respondMutation = useMutation({
    mutationFn: (accept: boolean) => mutateAndRefetch(() => api.post(`/arcade/rooms/${roomId}/respond`, { accept })),
    meta: { errorTitle: 'Could not respond to invite' },
  });

  const readyMutation = useMutation({
    mutationFn: (ready: boolean) => mutateAndRefetch(() => api.post(`/arcade/rooms/${roomId}/ready`, { ready })),
    meta: { errorTitle: 'Could not update ready state' },
  });

  const leaveMutation = useMutation({
    mutationFn: () => api.post(`/arcade/rooms/${roomId}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arcade-rooms'] });
      navigate('/arcade');
    },
    meta: { errorTitle: 'Could not leave room' },
  });

  const startMutation = useMutation({
    mutationFn: () => api.post(`/arcade/rooms/${roomId}/start`),
    meta: { errorTitle: 'Could not start the game' },
  });

  const playAgainMutation = useMutation({
    mutationFn: () =>
      room
        ? api
            .post<GameRoomDetail>('/arcade/rooms', {
              gameType: room.gameType,
              roundsTotal: room.roundsTotal,
              maxPlayers: room.maxPlayers,
              visibility: room.visibility,
              fillWithBots: room.fillWithBots,
            })
            .then((res) => res.data)
        : Promise.reject(new Error('No room')),
    onSuccess: (newRoom) => {
      queryClient.invalidateQueries({ queryKey: ['arcade-rooms'] });
      navigate(`/arcade/rooms/${newRoom.id}`);
    },
    meta: { errorTitle: 'Could not start a new room' },
  });

  if (roomQuery.isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (roomQuery.isError || !room) {
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={() => navigate('/arcade')} className="mb-6">
          <ArrowLeft size={16} />
          Back to Arcade
        </Button>
        <p className="py-16 text-center text-ink-400">
          This room doesn't exist, has closed, or you don't have access to it.
        </p>
      </div>
    );
  }

  const myMember = room.members.find(isMe);
  const meta = GAME_META[room.gameType];

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/arcade')}>
            <ArrowLeft size={18} />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-pine-700">{meta.icon}</span>
            <h1>{meta.label}</h1>
          </div>
        </div>
        {room.status === 'lobby' && myMember && !myMember.isHost && (
          <Button variant="ghost" onClick={() => leaveMutation.mutate()} disabled={leaveMutation.isPending}>
            <LogOut size={16} />
            Leave
          </Button>
        )}
      </div>

      {room.status === 'lobby' || room.status === 'starting' ? (
        <div className="space-y-6">
          {startsAt && room.status === 'starting' && <StartingBanner startsAt={startsAt} />}

          {!myMember && room.visibility === 'open' && room.status === 'lobby' && (
            <div className="flex items-center justify-between rounded-lg border border-brass-300 bg-brass-50 p-4">
              <p className="text-sm text-brass-800">Ask the host to let you in — request to join this room.</p>
              <Button variant="primary" onClick={() => requestJoinMutation.mutate()} disabled={requestJoinMutation.isPending}>
                {requestJoinMutation.isPending ? 'Requesting…' : 'Request to join'}
              </Button>
            </div>
          )}

          <LobbySeatGrid
            room={room}
            isHost={isHost}
            isMe={isMe}
            onKick={(m) => kickMutation.mutate(m)}
            onApprove={(m) => approveMutation.mutate(m)}
            onRespond={(accept) => respondMutation.mutate(accept)}
            onOpenInvite={() => setInviteOpen(true)}
            busyMemberId={busyMemberId}
          />

          {room.status === 'lobby' && myMember && ['joined', 'ready'].includes(myMember.status) && (
            <div className="flex items-center justify-between rounded-lg border border-ink-200 bg-bone-100 p-4">
              <div className="flex items-center gap-2 text-sm text-ink-500">
                <Settings2 size={14} />
                Best of {room.roundsTotal} · Max {room.maxPlayers} players
                {room.fillWithBots && ' · Bots fill empty seats'}
              </div>
              {isHost ? (
                <Button variant="primary" onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
                  <Play size={16} />
                  {startMutation.isPending ? 'Starting…' : 'Start game'}
                </Button>
              ) : (
                <Button
                  variant={myMember.status === 'ready' ? 'secondary' : 'primary'}
                  onClick={() => readyMutation.mutate(myMember.status !== 'ready')}
                  disabled={readyMutation.isPending}
                >
                  {myMember.status === 'ready' ? 'Not ready' : "I'm ready"}
                </Button>
              )}
            </div>
          )}
        </div>
      ) : room.status === 'in_progress' ? (
        room.gameType === 'word_bomb' ? (
          <WordBombStage room={room} onMatchEnd={() => queryClient.invalidateQueries({ queryKey: ['arcade-room', roomId] })} />
        ) : room.gameType === 'snake_royale' ? (
          <SnakeRoyaleBoard room={room} onMatchEnd={() => queryClient.invalidateQueries({ queryKey: ['arcade-room', roomId] })} />
        ) : room.gameType === 'doodle_relay' ? (
          <DoodleRelayStage room={room} onMatchEnd={() => queryClient.invalidateQueries({ queryKey: ['arcade-room', roomId] })} />
        ) : (
          <p className="py-20 text-center text-ink-400">This game is still loading…</p>
        )
      ) : room.status === 'finished' ? (
        <ResultsScreen
          room={room}
          isHost={isHost}
          onPlayAgain={() => playAgainMutation.mutate()}
          onBackToHub={() => navigate('/arcade')}
          playAgainPending={playAgainMutation.isPending}
        />
      ) : (
        <p className="py-20 text-center text-ink-400">This room was closed.</p>
      )}

      <InvitePickerDialog room={room} open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

function StartingBanner({ startsAt }: { startsAt: string }) {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((new Date(startsAt).getTime() - Date.now()) / 1000)));
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((new Date(startsAt).getTime() - Date.now()) / 1000)));
    }, 200);
    return () => clearInterval(id);
  }, [startsAt]);
  return (
    <div className="flex items-center justify-center rounded-lg border border-brass-300 bg-brass-50 py-6 text-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brass-600">Starting in</p>
        <p className="font-display text-4xl text-brass-800">{secondsLeft}</p>
      </div>
    </div>
  );
}
