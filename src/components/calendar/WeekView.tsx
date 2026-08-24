import { eachDayOfInterval, endOfWeek, startOfWeek } from 'date-fns';
import type { CalendarEvent } from '@/lib/types';
import { CalendarTimeGrid } from './CalendarTimeGrid';

interface Props {
  cursor: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
}

export function WeekView({ cursor, events, onSelectEvent }: Props) {
  const days = eachDayOfInterval({ start: startOfWeek(cursor), end: endOfWeek(cursor) });
  return <CalendarTimeGrid days={days} events={events} onSelectEvent={onSelectEvent} />;
}
