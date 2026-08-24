import type { CalendarEvent } from '@/lib/types';
import { CalendarTimeGrid } from './CalendarTimeGrid';

interface Props {
  cursor: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
}

export function DayView({ cursor, events, onSelectEvent }: Props) {
  return <CalendarTimeGrid days={[cursor]} events={events} onSelectEvent={onSelectEvent} />;
}
