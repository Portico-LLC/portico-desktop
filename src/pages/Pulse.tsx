import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Filter, X } from 'lucide-react';
import { api } from '@/lib/api';
import { getTeamChatSocket } from '@/lib/socket';
import type { ActivityEvent, ActivityPage, Task, Project, TeamMemberOption } from '@/lib/types';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

function FilterPill({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'max-w-[11rem] truncate rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition-colors duration-hover ease-brand',
        active
          ? 'border-brass-500 bg-brass-100 text-brass-800'
          : 'border-ink-200 bg-bone-50 text-ink-600 hover:border-ink-300'
      )}
    >
      {children}
    </button>
  );
}

export function Pulse() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const scope = (searchParams.get('scope') as 'studio' | 'project' | 'client') || 'studio';
  const projectId = searchParams.get('projectId') ?? undefined;
  const clientId = searchParams.get('clientId') ?? undefined;

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [priorities, setPriorities] = useState<string[]>([]);
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [actorIds, setActorIds] = useState<string[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filtersOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) setFiltersOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [filtersOpen]);

  // Filter-option lists — fetched lazily (only once the panel is opened), reusing the same
  // query keys as Tasks.tsx/TeamChat.tsx so an already-warm cache is shared instead of
  // triggering a second network round-trip.
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects').then((res) => res.data),
    enabled: filtersOpen,
  });
  const { data: tasksForFilter = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<Task[]>('/tasks').then((res) => res.data),
    enabled: filtersOpen,
  });
  const { data: members = [] } = useQuery({
    queryKey: ['team-chat', 'members'],
    queryFn: () => api.get<TeamMemberOption[]>('/team-chat/members').then((res) => res.data),
    enabled: filtersOpen,
  });

  const activeFilterCount =
    priorities.length +
    taskIds.length +
    actorIds.length +
    projectIds.length +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setPriorities([]);
    setTaskIds([]);
    setActorIds([]);
    setProjectIds([]);
  };

  // Each filter is an array, so selecting exactly one id is "single filtering" and selecting
  // several is "multi filtering" — same toggle, same state shape, no separate mode needed.
  const toggle = (list: string[], setList: (v: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const queryKey = [
    'activity',
    scope,
    projectId,
    clientId,
    dateFrom,
    dateTo,
    priorities,
    taskIds,
    actorIds,
    projectIds,
  ] as const;

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      api
        .get<ActivityPage>('/activity', {
          params: {
            scope,
            projectId,
            clientId,
            cursor: pageParam ?? undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            priorities: priorities.length ? priorities.join(',') : undefined,
            taskIds: taskIds.length ? taskIds.join(',') : undefined,
            actorIds: actorIds.length ? actorIds.join(',') : undefined,
            projectIds: projectIds.length ? projectIds.join(',') : undefined,
          },
        })
        .then((res) => res.data),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const matchesFilters = (event: ActivityEvent) => {
    if (priorities.length) {
      const p = (event.metadata as { priority?: string } | undefined)?.priority;
      if (!p || !priorities.includes(p)) return false;
    }
    if (taskIds.length && (event.sourceType !== 'task' || !taskIds.includes(event.sourceId))) return false;
    if (actorIds.length && (!event.actorId || !actorIds.includes(event.actorId))) return false;
    if (projectIds.length && (!event.projectId || !projectIds.includes(event.projectId))) return false;
    if (dateFrom && new Date(event.createdAt) < new Date(dateFrom)) return false;
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(event.createdAt) > to) return false;
    }
    return true;
  };

  useEffect(() => {
    const socket = getTeamChatSocket();
    if (!socket) return;
    const onActivity = (event: ActivityEvent) => {
      // Only splice into the currently-viewed feed when it actually matches this scope and
      // the active filters — avoids a filtered view suddenly gaining a row that wouldn't
      // have appeared if the same filters had been applied server-side.
      const matchesScope =
        scope === 'studio' ? true : scope === 'project' ? event.projectId === projectId : event.clientId === clientId;
      if (!matchesScope || !matchesFilters(event)) return;
      queryClient.setQueryData<{ pages: ActivityPage[]; pageParams: unknown[] }>(queryKey, (current) => {
        if (!current) return current;
        const [first, ...rest] = current.pages;
        return { ...current, pages: [{ ...first, events: [event, ...first.events] }, ...rest] };
      });
    };
    socket.on('activity:new', onActivity);
    return () => {
      socket.off('activity:new', onActivity);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, projectId, clientId, dateFrom, dateTo, priorities, taskIds, actorIds, projectIds]);

  const events = data?.pages.flatMap((p) => p.events) ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          {scope !== 'studio' && (
            <Link
              to="/pulse"
              className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors duration-hover ease-brand hover:text-ink-800"
            >
              <ArrowLeft size={14} />
              All activity
            </Link>
          )}
          <h1 className="mb-2 text-3xl sm:text-4xl font-display font-semibold text-ink-900">Pulse</h1>
          <p className="text-ink-500">
            {scope === 'studio'
              ? 'Everything happening across your studio, automatically.'
              : 'Activity for this ' + scope + '.'}
          </p>
        </div>

        <div className="relative flex-shrink-0" ref={filtersRef}>
          <Button variant="secondary" size="sm" onClick={() => setFiltersOpen((o) => !o)}>
            <Filter size={16} className="mr-1.5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="brass" className="ml-1.5 h-4 min-w-4 justify-center px-1">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {filtersOpen && (
            <div className="absolute right-0 z-30 mt-2 max-h-[70vh] w-[min(90vw,20rem)] sm:w-80 origin-top-right overflow-y-auto overflow-x-hidden rounded-sm border border-ink-300 bg-bone-50/95 p-4 shadow-md backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-ink-900">Filter activity</span>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-xs text-ink-400 hover:text-terracotta-600"
                  >
                    <X size={12} />
                    Clear all
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Date range</Label>
                  <div className="flex flex-col gap-2">
                    <Input
                      type="date"
                      className="w-full"
                      value={dateFrom}
                      max={dateTo || undefined}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-400">to</span>
                      <Input
                        type="date"
                        className="w-full"
                        value={dateTo}
                        min={dateFrom || undefined}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRIORITIES.map((p) => (
                      <FilterPill key={p} active={priorities.includes(p)} onClick={() => toggle(priorities, setPriorities, p)}>
                        {p}
                      </FilterPill>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Employees</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {members.length === 0 && <p className="text-xs text-ink-400">No team members yet.</p>}
                    {members.map((m) => (
                      <FilterPill key={m.id} active={actorIds.includes(m.id)} onClick={() => toggle(actorIds, setActorIds, m.id)} title={m.name}>
                        {m.name}
                      </FilterPill>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Projects</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {projects.length === 0 && <p className="text-xs text-ink-400">No projects yet.</p>}
                    {projects.map((p) => (
                      <FilterPill key={p.id} active={projectIds.includes(p.id)} onClick={() => toggle(projectIds, setProjectIds, p.id)} title={p.name}>
                        {p.name}
                      </FilterPill>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Tasks</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {tasksForFilter.length === 0 && <p className="text-xs text-ink-400">No tasks yet.</p>}
                    {tasksForFilter.map((t) => (
                      <FilterPill key={t.id} active={taskIds.includes(t.id)} onClick={() => toggle(taskIds, setTaskIds, t.id)} title={t.title}>
                        {t.title}
                      </FilterPill>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ActivityFeed
        events={events}
        isLoading={isLoading}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
      />
    </div>
  );
}
