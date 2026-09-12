import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Avatar } from '@/components/ui/Avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { PresenceBadge } from '@/components/ui/PresenceDot';
import { usePresenceStore, presenceStateOf } from '@/store/presence';
import type { BrowsableChannel, TeamMemberOption, TeamMemberType } from '@/lib/types';
import { Hash, Lock, Search, Check } from 'lucide-react';

/**
 * Browse, join, leave and create channels.
 *
 * Note this only ever lists standalone channels: project and DM membership is derived from
 * the project roster and recomputed server-side, so joining or leaving one would be undone
 * on the next fetch — the API rejects it outright.
 */
export function ChannelBrowserDialog({
  open,
  onOpenChange,
  members,
  onOpenChannel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: TeamMemberOption[];
  onOpenChannel: (channelId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'browse' | 'create'>('browse');
  const [search, setSearch] = useState('');

  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['team-chat-browse', search],
    queryFn: () =>
      api
        .get<BrowsableChannel[]>('/team-chat/channels/browse', { params: search ? { query: search } : undefined })
        .then((res) => res.data),
    enabled: open && tab === 'browse',
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['team-chat-browse'] });
    queryClient.invalidateQueries({ queryKey: ['team-chat-channels'] });
  };

  const join = useMutation({
    mutationFn: (channelId: string) => api.post(`/team-chat/channels/${channelId}/join`).then((r) => r.data),
    onSuccess: (_data, channelId) => {
      invalidate();
      onOpenChannel(channelId);
      onOpenChange(false);
    },
    meta: { successMessage: 'Joined channel', errorTitle: 'Could not join channel' },
  });

  const leave = useMutation({
    mutationFn: (channelId: string) => api.delete(`/team-chat/channels/${channelId}/leave`),
    onSuccess: invalidate,
    meta: { successMessage: 'Left channel', errorTitle: 'Could not leave channel' },
  });

  const create = useMutation({
    mutationFn: () =>
      api
        .post<{ id: string }>('/team-chat/channels', {
          name: name.trim(),
          topic: topic.trim() || undefined,
          isPrivate,
          memberIds: members
            .filter((m) => selected.has(`${m.type}:${m.id}`))
            .map((m) => ({ type: m.type, id: m.id })),
        })
        .then((res) => res.data),
    onSuccess: (channel) => {
      invalidate();
      onOpenChannel(channel.id);
      onOpenChange(false);
      setName('');
      setTopic('');
      setSelected(new Set());
    },
    meta: { successMessage: 'Channel created', errorTitle: 'Could not create channel' },
  });

  const toggleMember = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Channels</DialogTitle>
        </DialogHeader>

        <div className="mb-3 flex gap-1 rounded-md border border-ink-200 bg-ink-50 p-1">
          {(['browse', 'create'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTab(option)}
              className={cn(
                'flex-1 rounded-sm px-3 py-1.5 text-sm capitalize transition-colors duration-hover ease-brand',
                tab === option ? 'bg-surface font-medium text-ink-900 shadow-xs' : 'text-ink-500 hover:text-ink-700',
              )}
            >
              {option === 'browse' ? 'Browse' : 'Create'}
            </button>
          ))}
        </div>

        {tab === 'browse' ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-ink-400" />
              <Input
                placeholder="Search channels..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {isLoading ? (
                <p className="py-8 text-center text-sm text-ink-400">Loading…</p>
              ) : channels.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-400">
                  {search ? 'No channels match that search.' : 'No public channels yet.'}
                </p>
              ) : (
                channels.map((channel) => (
                  <div
                    key={channel.id}
                    className="flex items-center gap-3 rounded-sm border border-ink-200 px-3 py-2"
                  >
                    <Hash size={15} className="flex-shrink-0 text-ink-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{channel.name}</p>
                      <p className="truncate text-[11px] text-ink-400">
                        {channel.memberCount} {channel.memberCount === 1 ? 'member' : 'members'}
                        {channel.topic && ` · ${channel.topic}`}
                      </p>
                    </div>
                    {channel.isMember ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => leave.mutate(channel.id)}
                        disabled={leave.isPending}
                      >
                        Leave
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => join.mutate(channel.id)}
                        disabled={join.isPending}
                      >
                        Join
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim().length >= 2) create.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="channel-name">Name</Label>
              <Input
                id="channel-name"
                placeholder="design-review"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel-topic">Topic (optional)</Label>
              <Input
                id="channel-topic"
                placeholder="What this channel is for"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <label className="flex cursor-pointer select-none items-start gap-2.5 rounded-sm border border-ink-200 px-3 py-2.5">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded-sm border-ink-300 accent-brass-600"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium text-ink-900">
                  <Lock size={12} />
                  Private channel
                </span>
                <span className="block text-[11px] text-ink-400">
                  Hidden from the browser — people have to be added.
                </span>
              </span>
            </label>

            <div className="space-y-2">
              <Label>Add people</Label>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {members.map((member) => {
                  const key = `${member.type}:${member.id}`;
                  const checked = selected.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleMember(key)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left text-sm transition-colors duration-hover ease-brand',
                        checked ? 'bg-brass-50' : 'hover:bg-ink-50',
                      )}
                    >
                      <Avatar name={member.name} src={member.avatarUrl ?? undefined} className="h-6 w-6" />
                      <span className="min-w-0 flex-1 truncate text-ink-800">{member.name}</span>
                      {checked && <Check size={14} className="flex-shrink-0 text-brass-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={name.trim().length < 2 || create.isPending}>
                {create.isPending ? 'Creating…' : 'Create channel'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function NewDmDialog({
  open,
  onOpenChange,
  members,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: TeamMemberOption[];
  onCreated: (channelId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const entries = usePresenceStore((s) => s.entries);

  const create = useMutation({
    mutationFn: (target: { type: TeamMemberType; id: string }) =>
      api
        .post<{ id: string }>('/team-chat/dms', { targetType: target.type, targetId: target.id })
        .then((res) => res.data),
    onSuccess: (channel) => {
      queryClient.invalidateQueries({ queryKey: ['team-chat-channels'] });
      onCreated(channel.id);
      onOpenChange(false);
      setSearch('');
    },
    meta: { successMessage: 'Conversation started', errorTitle: 'Could not start conversation' },
  });

  const filtered = members.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New direct message</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-ink-400" />
            <Input
              placeholder="Search your team..."
              className="pl-10"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-400">Nobody matches that search.</p>
            ) : (
              filtered.map((member) => {
                const presence = entries[`${member.type}:${member.id}`];
                return (
                  <button
                    key={`${member.type}:${member.id}`}
                    type="button"
                    onClick={() => create.mutate({ type: member.type, id: member.id })}
                    disabled={create.isPending}
                    className="flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left transition-colors duration-hover ease-brand hover:bg-ink-50 disabled:opacity-60"
                  >
                    <PresenceBadge state={presenceStateOf(presence)} size="sm">
                      <Avatar name={member.name} src={member.avatarUrl ?? undefined} className="h-8 w-8" />
                    </PresenceBadge>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-900">{member.name}</span>
                      {presence?.focusMode && (
                        <span className="block text-[11px] text-brass-700">In focus mode</span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
