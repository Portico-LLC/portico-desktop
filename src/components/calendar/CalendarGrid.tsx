import {
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isToday,
  format,
} from 'date-fns';
import type { CalendarEvent } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  cursor: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_VISIBLE_PER_DAY = 3;

export function CalendarGrid({ cursor, events, onSelectEvent }: Props) {
  const gridStart = startOfWeek(startOfMonth(cursor));
  const gridEnd = endOfWeek(endOfMonth(cursor));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = format(new Date(event.start), 'yyyy-MM-dd');
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push(event);
  }

  return (
    <div className="overflow-hidden rounded-md border border-ink-200 bg-bone-50 shadow-xs">
      <div className="grid grid-cols-7 border-b border-ink-200 bg-ink-50">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-ink-500">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEvents = (eventsByDay.get(key) || []).sort((a, b) => a.start.localeCompare(b.start));
          const inMonth = isSameMonth(day, cursor);
          const today = isToday(day);

          return (
            <div
              key={key}
              className={cn(
                'min-h-[112px] border-b border-r border-ink-200 p-1.5 last:border-r-0',
                !inMonth && 'bg-ink-50/50'
              )}
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                  today
                    ? 'bg-pine-800 font-semibold text-bone-50'
                    : inMonth
                    ? 'text-ink-700'
                    : 'text-ink-400'
                )}
              >
                {format(day, 'd')}
              </span>

              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, MAX_VISIBLE_PER_DAY).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    title={event.title}
                    className="block w-full truncate rounded-sm bg-pine-100 px-1.5 py-0.5 text-left text-[11px] font-medium text-pine-800 transition-all duration-hover ease-brand hover:translate-y-[-1px] hover:bg-pine-200 hover:shadow-xs"
                  >
                    {!event.allDay && (
                      <span className="mr-1 text-pine-600">{format(new Date(event.start), 'h:mma').toLowerCase()}</span>
                    )}
                    {event.title}
                  </button>
                ))}
                {dayEvents.length > MAX_VISIBLE_PER_DAY && (
                  <span className="block px-1.5 text-[10px] text-ink-400">
                    +{dayEvents.length - MAX_VISIBLE_PER_DAY} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
