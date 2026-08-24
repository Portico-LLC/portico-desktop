import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isPast,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, RefreshCw, Video } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { CalendarConnectionStatus, CalendarEvent, Task } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { PanelListRow, PanelSkeletonList } from '@/components/panel/PanelListPrimitives';
import { cn } from '@/lib/utils';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function dueBadge(dueDate?: string) {
  if (!dueDate) return null;
  const date = parseISO(dueDate);
  if (isPast(date) && !isToday(date)) {
    return <Badge variant="terracotta">Overdue</Badge>;
  }
  if (isToday(date)) {
    return <Badge variant="ochre">Today</Badge>;
  }
  return <Badge variant="outline">{format(date, 'MMM d')}</Badge>;
}

function eventTimeLabel(event: CalendarEvent) {
  if (event.allDay) return 'All day';
  return `${format(parseISO(event.start), 'h:mm a')} – ${format(parseISO(event.end), 'h:mm a')}`;
}

export function CalendarTab() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  const { data: tasks = [], isLoading, refetch: refetchTasks, isFetching: tasksFetching } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<Task[]>('/tasks').then((res) => res.data),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const toggleDone = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      api.patch(`/tasks/${id}`, { status: done ? 'done' : 'todo' }).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const { data: status } = useQuery({
    queryKey: ['google-calendar-status'],
    queryFn: () => api.get<CalendarConnectionStatus>('/integrations/google-calendar/status').then((res) => res.data),
    staleTime: 60_000,
  });

  const gridStart = useMemo(() => startOfWeek(startOfMonth(month)), [month]);
  const gridEnd = useMemo(() => endOfWeek(endOfMonth(month)), [month]);

  const {
    data: events = [],
    refetch: refetchEvents,
    isFetching: eventsFetching,
  } = useQuery({
    queryKey: ['google-calendar-events', gridStart.toISOString(), gridEnd.toISOString()],
    queryFn: () =>
      api
        .get<CalendarEvent[]>('/integrations/google-calendar/events', {
          params: { start: gridStart.toISOString(), end: gridEnd.toISOString() },
        })
        .then((res) => res.data),
    enabled: !!status?.connected,
  });

  const mine = useMemo(
    () => tasks.filter((t) => t.assigneeId === currentUser?.id && t.status !== 'done' && t.dueDate),
    [tasks, currentUser],
  );

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of mine) {
      const key = format(parseISO(task.dueDate!), 'yyyy-MM-dd');
      const existing = map.get(key);
      if (existing) existing.push(task);
      else map.set(key, [task]);
    }
    return map;
  }, [mine]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = format(parseISO(event.start), 'yyyy-MM-dd');
      const existing = map.get(key);
      if (existing) existing.push(event);
      else map.set(key, [event]);
    }
    return map;
  }, [events]);

  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd]);

  const selectedDayTasks = tasksByDate.get(format(selectedDay, 'yyyy-MM-dd')) ?? [];
  const selectedDayEvents = eventsByDate.get(format(selectedDay, 'yyyy-MM-dd')) ?? [];

  const refreshing = tasksFetching || eventsFetching;
  const refreshAll = () => {
    refetchTasks();
    if (status?.connected) refetchEvents();
  };

  if (isLoading) {
    return <PanelSkeletonList count={4} rowHeight="h-8" />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-ink-100 px-3 py-2">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setMonth((m) => subMonths(m, 1))}
          className="flex h-6 w-6 items-center justify-center rounded-sm text-ink-400 transition-colors duration-hover ease-brand hover:bg-ink-100 hover:text-ink-700"
        >
          <ChevronLeft size={14} />
        </button>
        <p className="text-sm font-medium text-ink-900">{format(month, 'MMMM yyyy')}</p>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Refresh"
            title="Refresh"
            onClick={refreshAll}
            className="flex h-6 w-6 items-center justify-center rounded-sm text-ink-400 transition-colors duration-hover ease-brand hover:bg-ink-100 hover:text-ink-700"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="flex h-6 w-6 items-center justify-center rounded-sm text-ink-400 transition-colors duration-hover ease-brand hover:bg-ink-100 hover:text-ink-700"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {status && !status.connected && (
        <p className="flex-shrink-0 px-3 pt-2 text-[11px] text-ink-400">
          Connect Google Calendar from the full app to see events here.
        </p>
      )}

      <div className="flex-shrink-0 px-3 pt-2">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={i} className="text-center text-[10px] font-medium uppercase text-ink-400">
              {label}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate.get(key) ?? [];
            const dayEvents = eventsByDate.get(key) ?? [];
            const inMonth = isSameMonth(day, month);
            const today = isToday(day);
            const selected = isSameDay(day, selectedDay);
            const hasOverdue = dayTasks.some((t) => isPast(parseISO(t.dueDate!)) && !isToday(parseISO(t.dueDate!)));

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={cn(
                  'relative flex aspect-square flex-col items-center justify-center rounded-sm text-xs transition-colors duration-hover ease-brand',
                  selected
                    ? 'bg-pine-800 text-bone-50'
                    : today
                      ? 'bg-ochre-100 text-ochre-600'
                      : inMonth
                        ? 'text-ink-700 hover:bg-ink-100'
                        : 'text-ink-300 hover:bg-ink-50',
                )}
              >
                <span>{format(day, 'd')}</span>
                {(dayTasks.length > 0 || dayEvents.length > 0) && (
                  <span className="absolute bottom-1 flex items-center gap-0.5">
                    {dayTasks.length > 0 && (
                      <span
                        className={cn(
                          'h-1 w-1 rounded-full',
                          selected ? 'bg-bone-50' : hasOverdue ? 'bg-terracotta-600' : 'bg-pine-600',
                        )}
                      />
                    )}
                    {dayEvents.length > 0 && (
                      <span className={cn('h-1 w-1 rounded-full', selected ? 'bg-bone-50' : 'bg-steel-600')} />
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-1 flex-1 overflow-y-auto no-scrollbar border-t border-ink-100">
        <p className="px-3 py-2 text-[11px] font-medium uppercase text-ink-400">
          {format(selectedDay, 'EEEE, MMM d')}
        </p>

        <p className="px-3 pb-1 text-[10px] font-medium uppercase text-ink-300">Tasks</p>
        {selectedDayTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 px-6 pb-4 pt-1 text-center">
            <p className="text-xs text-ink-400">No tasks due this day.</p>
          </div>
        ) : (
          <div className="divide-y divide-ink-100 border-b border-ink-100">
            {selectedDayTasks.map((task, index) => (
              <PanelListRow as="label" key={task.id} index={index} className="select-none">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={(e) => toggleDone.mutate({ id: task.id, done: e.target.checked })}
                  className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-sm border-ink-300 bg-bone-50 accent-brass-600 focus:ring-2 focus:ring-brass-200"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink-900">{task.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {task.project && <span className="truncate text-[11px] text-ink-400">{task.project.name}</span>}
                    {dueBadge(task.dueDate)}
                  </div>
                </div>
              </PanelListRow>
            ))}
          </div>
        )}

        {status?.connected && (
          <>
            <p className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase text-ink-300">Events</p>
            {selectedDayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-6 text-center">
                <CalendarDays className="h-5 w-5 text-ink-300" />
                <p className="text-xs text-ink-400">No events this day.</p>
              </div>
            ) : (
              <div className="divide-y divide-ink-100">
                {selectedDayEvents.map((event, index) => (
                  <PanelListRow key={event.id} index={index} interactive={false} className="block">
                    <p className="truncate text-sm text-ink-900">{event.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-ink-400">{eventTimeLabel(event)}</span>
                      {event.meetLink && (
                        <a
                          href={event.meetLink}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] font-medium text-pine-700 hover:text-pine-900"
                        >
                          <Video size={11} />
                          Join
                        </a>
                      )}
                    </div>
                  </PanelListRow>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
