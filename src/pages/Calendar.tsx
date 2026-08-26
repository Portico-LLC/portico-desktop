import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw, Unplug } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { openGoogleCalendarConnectPopup } from '@/lib/googleCalendarAuth';
import type { CalendarConnectionStatus, CalendarEvent } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { WeekView } from '@/components/calendar/WeekView';
import { DayView } from '@/components/calendar/DayView';
import { EventDetailDialog } from '@/components/calendar/EventDetailDialog';
import { NewEventDialog } from '@/components/calendar/NewEventDialog';

type ViewMode = 'month' | 'week' | 'day';

export function Calendar() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [newEventOpen, setNewEventOpen] = useState(false);

  const { data: status, isLoading: statusLoading } = useQuery<CalendarConnectionStatus>({
    queryKey: ['google-calendar-status'],
    queryFn: () => api.get('/integrations/google-calendar/status').then((r) => r.data),
  });

  const { start, end } = useMemo(() => {
    if (viewMode === 'month') return { start: startOfWeek(startOfMonth(cursor)), end: endOfWeek(endOfMonth(cursor)) };
    if (viewMode === 'week') return { start: startOfWeek(cursor), end: endOfWeek(cursor) };
    return { start: startOfDay(cursor), end: startOfDay(addDays(cursor, 1)) };
  }, [viewMode, cursor]);

  const eventsQuery = useQuery<CalendarEvent[]>({
    queryKey: ['google-calendar-events', start.toISOString(), end.toISOString()],
    queryFn: () =>
      api
        .get('/integrations/google-calendar/events', { params: { start: start.toISOString(), end: end.toISOString() } })
        .then((r) => r.data),
    enabled: !!status?.connected,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const connectMutation = useMutation({
    mutationFn: () => openGoogleCalendarConnectPopup(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
      queryClient.invalidateQueries({ queryKey: ['google-calendar-events'] });
    },
    meta: { successMessage: 'Google Calendar connected', suppressErrorToast: true },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => api.delete('/integrations/google-calendar/connection'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
      queryClient.invalidateQueries({ queryKey: ['google-calendar-events'] });
    },
    meta: { successMessage: 'Google Calendar disconnected', errorTitle: 'Could not disconnect Google Calendar' },
  });

  const goPrev = () =>
    setCursor((d) => (viewMode === 'month' ? subMonths(d, 1) : viewMode === 'week' ? subWeeks(d, 1) : subDays(d, 1)));
  const goNext = () =>
    setCursor((d) => (viewMode === 'month' ? addMonths(d, 1) : viewMode === 'week' ? addWeeks(d, 1) : addDays(d, 1)));
  const goToday = () => setCursor(new Date());

  const headerLabel =
    viewMode === 'month'
      ? format(cursor, 'MMMM yyyy')
      : viewMode === 'week'
      ? `${format(startOfWeek(cursor), 'MMM d')} – ${format(endOfWeek(cursor), 'MMM d, yyyy')}`
      : format(cursor, 'EEEE, MMMM d, yyyy');

  return (
    <div className="space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-ink-900">Calendar</h1>

        {status?.connected && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={goToday}>
              Today
            </Button>
            <div className="flex items-center rounded-sm border border-ink-200">
              <button
                type="button"
                onClick={goPrev}
                className="p-2 text-ink-600 transition-all duration-hover ease-brand hover:bg-ink-100"
                aria-label="Previous"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="p-2 text-ink-600 transition-all duration-hover ease-brand hover:bg-ink-100"
                aria-label="Next"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <span className="min-w-[180px] font-display text-lg text-ink-900">{headerLabel}</span>
            <div className="flex items-center overflow-hidden rounded-sm border border-ink-200">
              {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'px-3 py-1.5 text-sm capitalize transition-all duration-hover ease-brand',
                    viewMode === mode ? 'bg-pine-800 text-bone-50' : 'text-ink-600 hover:bg-ink-100'
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => eventsQuery.refetch()}
              title="Refresh"
              className="rounded-sm border border-ink-200 p-2 text-ink-600 transition-all duration-hover ease-brand hover:bg-ink-100"
            >
              <RefreshCw size={14} className={eventsQuery.isFetching ? 'animate-spin' : ''} />
            </button>
            <Button variant="primary" size="sm" onClick={() => setNewEventOpen(true)}>
              <Plus size={16} />
              New Event
            </Button>
          </div>
        )}
      </header>

      {!statusLoading && !status?.connected && (
        <Card className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-ink-200 bg-ink-50/40 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brass-100">
            <CalendarDays size={26} className="text-brass-600" />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <h2 className="font-display text-xl text-ink-900">Connect Google Calendar</h2>
            <p className="max-w-md text-sm text-ink-500">
              Connect your Gmail account to see your meetings and events here, and to schedule new ones — with a
              Google Meet link and your team or client invited — without leaving Portico.
            </p>
          </div>
          <Button
            onClick={() => connectMutation.mutate()}
            disabled={connectMutation.isPending}
            className="mt-1 hover:translate-y-[-1px] hover:shadow-sm"
          >
            {connectMutation.isPending ? 'Connecting…' : 'Connect Google Calendar'}
          </Button>
          {connectMutation.isError && (
            <p className="text-sm text-terracotta-600">{getErrorMessage(connectMutation.error)}</p>
          )}
        </Card>
      )}

      {status?.connected && (
        <>
          <div className="flex items-center justify-between text-xs text-ink-400">
            <span>Connected as {status.googleAccountEmail}</span>
            <button
              type="button"
              onClick={() => disconnectMutation.mutate()}
              className="flex items-center gap-1 text-terracotta-500 transition-colors duration-hover ease-brand hover:text-terracotta-700"
            >
              <Unplug size={12} />
              Disconnect
            </button>
          </div>

          {eventsQuery.isLoading ? (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : eventsQuery.isError ? (
            <Card className="p-6 text-center text-sm text-terracotta-600">{getErrorMessage(eventsQuery.error)}</Card>
          ) : viewMode === 'month' ? (
            <CalendarGrid cursor={cursor} events={eventsQuery.data || []} onSelectEvent={setSelectedEvent} />
          ) : viewMode === 'week' ? (
            <WeekView cursor={cursor} events={eventsQuery.data || []} onSelectEvent={setSelectedEvent} />
          ) : (
            <DayView cursor={cursor} events={eventsQuery.data || []} onSelectEvent={setSelectedEvent} />
          )}
        </>
      )}

      <EventDetailDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      <NewEventDialog open={newEventOpen} onOpenChange={setNewEventOpen} />
    </div>
  );
}
