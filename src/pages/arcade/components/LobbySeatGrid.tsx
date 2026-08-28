import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Crown, X, Check, Clock, Bot, UserPlus } from 'lucide-react';
import { Avatar, getInitials } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { seatColor } from '@/lib/arcade/playerColors';
import { motionTransition, springs } from '@/lib/motion/springs';
import { cn } from '@/lib/utils';
import type { GameRoomDetail, GameRoomMember } from '@/lib/types';

interface LobbySeatGridProps {
  room: GameRoomDetail;
  isHost: boolean;
  isMe: (member: GameRoomMember) => boolean;
  onKick: (member: GameRoomMember) => void;
  onApprove: (member: GameRoomMember) => void;
  onRespond: (accept: boolean) => void;
  onOpenInvite: () => void;
  busyMemberId?: string;
}

const ACTIVE = new Set(['joined', 'ready']);

export function LobbySeatGrid({ room, isHost, isMe, onKick, onApprove, onRespond, onOpenInvite, busyMemberId }: LobbySeatGridProps) {
  const reduce = !!useReducedMotion();
  const active = [...room.members]
    .filter((m) => ACTIVE.has(m.status))
    .sort((a, b) => (a.isHost === b.isHost ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() : a.isHost ? -1 : 1));
  const pending = room.members.filter((m) => m.status === 'invited' || m.status === 'requested');
  const emptySeats = Math.max(0, room.maxPlayers - active.length);

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-400">
            Players — {active.length}/{room.maxPlayers}
          </h3>
          {isHost && room.status === 'lobby' && (
            <Button size="sm" variant="ghost" onClick={onOpenInvite}>
              <UserPlus size={14} />
              Invite
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AnimatePresence initial={false}>
            {active.map((member, i) => {
              const colors = seatColor(i);
              const mine = isMe(member);
              return (
                <motion.div
                  key={member.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={motionTransition(reduce, springs.snappy)}
                  className={cn(
                    'group relative flex flex-col items-center gap-2 rounded-md border p-3 text-center',
                    mine ? 'border-brass-400 bg-brass-50' : 'border-ink-200 bg-bone-100',
                  )}
                >
                  {isHost && !member.isHost && room.status === 'lobby' && (
                    <button
                      onClick={() => onKick(member)}
                      title="Remove from room"
                      className="absolute right-1.5 top-1.5 rounded-sm p-1 text-ink-400 opacity-0 transition-opacity duration-hover ease-brand hover:bg-terracotta-100 hover:text-terracotta-600 group-hover:opacity-100"
                    >
                      <X size={12} />
                    </button>
                  )}
                  <div
                    className={cn(
                      'relative flex h-11 w-11 items-center justify-center rounded-full text-xs font-medium text-bone-50 ring-2 ring-offset-2 ring-offset-bone-100',
                      colors.bg,
                      colors.ring,
                    )}
                  >
                    {member.isBot ? <Bot size={18} /> : getInitials(member.displayName)}
                    {member.isHost && (
                      <span className="absolute -right-1.5 -top-1.5 rounded-full bg-brass-500 p-0.5 text-bone-50">
                        <Crown size={10} />
                      </span>
                    )}
                  </div>
                  <p className="w-full truncate text-xs font-medium text-ink-900">{mine ? 'You' : member.displayName}</p>
                  {member.status === 'ready' ? (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-moss-600">
                      <Check size={11} /> Ready
                    </span>
                  ) : member.isHost ? (
                    <span className="text-[11px] text-ink-400">Host</span>
                  ) : (
                    <span className="text-[11px] text-ink-400">Not ready</span>
                  )}
                </motion.div>
              );
            })}

            {Array.from({ length: emptySeats }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-ink-200 p-3 text-center"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-ink-300 text-ink-300">
                  {room.fillWithBots ? <Bot size={16} /> : <span className="text-lg">+</span>}
                </div>
                <p className="text-[11px] text-ink-400">{room.fillWithBots ? 'Bot will fill in' : 'Open seat'}</p>
              </div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {pending.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-400">Pending</h3>
          <div className="space-y-2">
            {pending.map((member) => {
              const mine = isMe(member);
              const busy = busyMemberId === member.id;
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-ink-200 bg-bone-100 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar name={member.displayName} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink-900">{mine ? 'You' : member.displayName}</p>
                      <p className="flex items-center gap-1 text-[11px] text-ink-400">
                        <Clock size={10} />
                        {member.status === 'invited' ? 'Invited' : 'Requested to join'}
                      </p>
                    </div>
                  </div>
                  {mine && member.status === 'invited' ? (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => onRespond(false)} disabled={busy}>
                        Decline
                      </Button>
                      <Button size="sm" variant="primary" onClick={() => onRespond(true)} disabled={busy}>
                        Accept
                      </Button>
                    </div>
                  ) : isHost && member.status === 'requested' ? (
                    <Button size="sm" variant="primary" onClick={() => onApprove(member)} disabled={busy}>
                      Approve
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
