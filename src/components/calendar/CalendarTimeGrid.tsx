import { useEffect, useRef } from 'react';
import { differenceInMinutes, format, isSameDay, isToday, startOfDay } from 'date-fns';
import type { CalendarEvent } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  days: Date[];
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
}

const HOUR_HEIGHT = 56; // px per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function eventsForDay(events: CalendarEvent[], day: Date) {
  return events.filter((e) => isSameDay(new Date(e.start), day));
}

export function CalendarTimeGrid({ days, events, onSelectEvent }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Center the initial scroll around the morning, so the day isn't stuck at 12am.
    scrollRef.current?.scrollTo({ top: HOUR_HEIGHT * 7 });
  }, []);

  const allDayEvents = days.flatMap((day) => eventsForDay(events, day).filter((e) => e.allDay));
  const timedEventsByDay = days.map((day) => eventsForDay(events, day).filter((e) => !e.allDay));

  return (
    <div className="overflow-hidden rounded-md border border-ink-200 bg-bone-50 shadow-xs">
      {/* Day headers */}
      <div
        className="grid border-b border-ink-200 bg-ink-50"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
      >
        <div />
        {days.map((day) => (
          <div key={day.toISOString()} className="px-2 py-2 text-center">
            <div className="text-xs font-medium uppercase tracking-wide text-ink-500">{format(day, 'EEE')}</div>
            <div
              className={cn(
                'mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-sm',
                isToday(day) ? 'bg-pine-800 font-semibold text-bone-50' : 'text-ink-800'
              )}
            >
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* All-day strip */}
      {allDayEvents.length > 0 && (
        <div
          className="grid gap-1 border-b border-ink-200 bg-bone-100 p-1.5"
          style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
        >
          <span className="text-[10px] uppercase tracking-wide text-ink-400">All day</span>
          {days.map((day) => (
            <div key={day.toISOString()} className="space-y-1">
              {eventsForDay(events, day)
                .filter((e) => e.allDay)
                .map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    className="block w-full truncate rounded-sm bg-brass-100 px-1.5 py-0.5 text-left text-[11px] font-medium text-brass-800 transition-all duration-hover ease-brand hover:translate-y-[-1px] hover:bg-brass-200 hover:shadow-xs"
                  >
                    {event.title}
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}

      {/* Hourly grid */}
      <div ref={scrollRef} className="max-h-[640px] overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
          {/* Hour labels column */}
          <div>
            {HOURS.map((hour) => (
              <div key={hour} style={{ height: HOUR_HEIGHT }} className="border-b border-ink-100 pr-2 text-right">
                <span className="relative -top-2 text-[10px] text-ink-400">
                  {hour === 0 ? '' : format(new Date(2000, 0, 1, hour), 'h a').toLowerCase()}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIndex) => {
            const dayStart = startOfDay(day);
            return (
              <div key={day.toISOString()} className="relative border-l border-ink-100">
                {HOURS.map((hour) => (
                  <div key={hour} style={{ height: HOUR_HEIGHT }} className="border-b border-ink-100" />
                ))}
                {timedEventsByDay[dayIndex].map((event) => {
                  const startMin = differenceInMinutes(new Date(event.start), dayStart);
                  const endMin = differenceInMinutes(new Date(event.end), dayStart);
                  const top = (Math.max(startMin, 0) / 60) * HOUR_HEIGHT;
                  const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 18);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectEvent(event)}
                      title={event.title}
                      style={{ top, height }}
                      className="absolute left-0.5 right-0.5 overflow-hidden rounded-sm border-l-2 border-pine-600 bg-pine-100 px-1.5 py-0.5 text-left text-[11px] font-medium text-pine-800 shadow-xs transition-all duration-hover ease-brand hover:translate-y-[-1px] hover:bg-pine-200 hover:shadow-sm"
                    >
                      <span className="block truncate">{event.title}</span>
                      {height > 32 && (
                        <span className="block truncate text-pine-600">{format(new Date(event.start), 'h:mm a').toLowerCase()}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
