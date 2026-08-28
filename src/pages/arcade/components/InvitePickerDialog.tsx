import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import type { GameRoomDetail, TeamMemberOption } from '@/lib/types';

interface InvitePickerDialogProps {
  room: GameRoomDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EXCLUDED_STATUSES = new Set(['declined', 'left', 'kicked']);

export function InvitePickerDialog({ room, open, onOpenChange }: InvitePickerDialogProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: roster = [] } = useQuery({
    queryKey: ['arcade-roster'],
    queryFn: () => api.get<TeamMemberOption[]>('/arcade/roster').then((res) => res.data),
    enabled: open,
  });

  const alreadyInRoom = new Set(
    room.members.filter((m) => !EXCLUDED_STATUSES.has(m.status)).map((m) => `${m.memberType}:${m.memberId}`),
  );
  const invitable = roster.filter(
    (r) => !alreadyInRoom.has(`${r.type}:${r.id}`) && r.name.toLowerCase().includes(search.toLowerCase()),
  );

  const inviteMutation = useMutation({
    mutationFn: (target: TeamMemberOption) => api.post(`/arcade/rooms/${room.id}/invite`, { type: target.type, id: target.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['arcade-room', room.id] }),
    meta: { successMessage: 'Invite sent', errorTitle: 'Could not send invite' },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite teammates</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-ink-400" />
          <Input placeholder="Search team…" className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="max-h-72 space-y-1 overflow-y-auto">
          {invitable.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">
              {search ? 'No one matches your search.' : 'Everyone in the studio is already in this room.'}
            </p>
          ) : (
            invitable.map((member) => {
              const pending = inviteMutation.isPending && inviteMutation.variables?.id === member.id;
              return (
                <div
                  key={`${member.type}:${member.id}`}
                  className="flex items-center justify-between gap-3 rounded-sm px-2 py-2 transition-colors duration-hover ease-brand hover:bg-ink-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={member.name} size="sm" />
                    <span className="truncate text-sm text-ink-900">{member.name}</span>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => inviteMutation.mutate(member)} disabled={pending}>
                    <UserPlus size={14} />
                    {pending ? 'Inviting…' : 'Invite'}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
