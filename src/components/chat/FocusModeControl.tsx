import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { PresenceDot } from '@/components/ui/PresenceDot';
import { usePresenceStore } from '@/store/presence';
import type { PresenceEntry, TeamMemberType } from '@/lib/types';
import { Moon, X } from 'lucide-react';
import { format } from 'date-fns';

/** Durations people actually pick. "Until tomorrow" resolves to 9am, not a raw +24h, which
 *  is what someone ending their day actually means. */
const PRESETS = [
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: 'Until tomorrow', minutes: null },
  { label: "Until I turn it off", minutes: 0 },
] as const;

function resolveUntil(minutes: number | null): string | undefined {
  if (minutes === 0) return undefined;
  if (minutes === null) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.toISOString();
  }
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

/**
 * The user's own Focus Mode switch.
 *
 * Turning it on doesn't block anything — messages still arrive and still appear in the
 * inbox. What it stops is the interruption: no sound, no toast, no bell count, until focus
 * ends and everything held is released together.
 */
export function FocusModeControl({
  myType,
  myId,
  className,
}: {
  myType: TeamMemberType;
  myId: string;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [preset, setPreset] = useState<number | null>(60);

  const mine = usePresenceStore((s) => s.entries[`${myType}:${myId}`]) as PresenceEntry | undefined;
  const applyPresence = usePresenceStore((s) => s.apply);
  const active = !!mine?.focusMode;

  const start = useMutation({
    mutationFn: () =>
      api
        .put<PresenceEntry>('/team-chat/presence/focus', {
          until: resolveUntil(preset),
          message: message.trim() || undefined,
        })
        .then((res) => res.data),
    onSuccess: (entry) => {
      applyPresence(entry);
      setOpen(false);
      setMessage('');
    },
    meta: { successMessage: 'Focus mode on', errorTitle: 'Could not start focus mode' },
  });

  const end = useMutation({
    mutationFn: () => api.delete<PresenceEntry>('/team-chat/presence/focus').then((res) => res.data),
    onSuccess: (entry) => {
      applyPresence(entry);
      // Everything held during focus just became visible.
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    meta: { successMessage: 'Focus mode off', errorTitle: 'Could not end focus mode' },
  });

  if (active) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border border-brass-200 bg-brass-50 px-3 py-2',
          className,
        )}
      >
        <PresenceDot state="focus" size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-brass-800">
            Focus mode
            {mine?.focusUntil && ` · until ${format(new Date(mine.focusUntil), 'h:mm a')}`}
          </p>
          {mine?.focusMessage && <p className="truncate text-[11px] text-brass-700">{mine.focusMessage}</p>}
        </div>
        <button
          type="button"
          onClick={() => end.mutate()}
          disabled={end.isPending}
          aria-label="Turn off focus mode"
          className="rounded-sm p-1 text-brass-700 transition-colors duration-hover ease-brand hover:bg-brass-100"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} className={className}>
        <Moon size={14} />
        Focus mode
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Focus mode</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-ink-500">
              Messages keep arriving and still land in your inbox — they just won't interrupt you. You'll get a
              summary of anything you missed when focus ends.
            </p>

            <div className="space-y-2">
              <Label>For how long</Label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setPreset(option.minutes)}
                    className={cn(
                      'rounded-sm border px-3 py-1.5 text-xs transition-colors duration-hover ease-brand',
                      preset === option.minutes
                        ? 'border-brass-500 bg-brass-50 text-brass-800'
                        : 'border-ink-200 text-ink-600 hover:border-ink-300 hover:bg-ink-50',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="focus-message">What you're working on (optional)</Label>
              <Input
                id="focus-message"
                maxLength={140}
                placeholder="Heads-down on the deploy"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className="text-[11px] text-ink-400">Your team sees this when they open a DM with you.</p>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => start.mutate()} disabled={start.isPending}>
                {start.isPending ? 'Starting…' : 'Start focus'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
