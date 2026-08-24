import { format, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, ExternalLink, MapPin, Users, AlignLeft, Video } from 'lucide-react';
import type { CalendarEvent } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface Props {
  event: CalendarEvent | null;
  onClose: () => void;
}

function formatRange(event: CalendarEvent): string {
  const start = new Date(event.start);
  const end = new Date(event.end);
  if (event.allDay) {
    return isSameDay(start, end) ? format(start, 'EEEE, MMMM d') : `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  }
  const sameDay = isSameDay(start, end);
  return sameDay
    ? `${format(start, 'EEEE, MMMM d · h:mm a')} – ${format(end, 'h:mm a')}`
    : `${format(start, 'MMM d, h:mm a')} – ${format(end, 'MMM d, h:mm a')}`;
}

const RESPONSE_BADGE: Record<string, { label: string; variant: 'pine' | 'terracotta' | 'ochre' | 'neutral' }> = {
  accepted: { label: 'Accepted', variant: 'pine' },
  declined: { label: 'Declined', variant: 'terracotta' },
  tentative: { label: 'Maybe', variant: 'ochre' },
  needsAction: { label: 'No reply', variant: 'neutral' },
};

export function EventDetailDialog({ event, onClose }: Props) {
  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      {event && (
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{event.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1 text-sm">
            <div className="flex items-start gap-2.5 text-ink-700">
              <CalendarIcon size={16} className="mt-0.5 flex-shrink-0 text-ink-400" />
              <span>{formatRange(event)}</span>
            </div>

            {event.location && (
              <div className="flex items-start gap-2.5 text-ink-700">
                <MapPin size={16} className="mt-0.5 flex-shrink-0 text-ink-400" />
                <span>{event.location}</span>
              </div>
            )}

            {event.description && (
              <div className="flex items-start gap-2.5 text-ink-700">
                <AlignLeft size={16} className="mt-0.5 flex-shrink-0 text-ink-400" />
                <p className="whitespace-pre-wrap break-words text-ink-600">{event.description}</p>
              </div>
            )}

            {event.attendees.length > 0 && (
              <div className="flex items-start gap-2.5 text-ink-700">
                <Users size={16} className="mt-0.5 flex-shrink-0 text-ink-400" />
                <ul className="flex-1 space-y-1.5">
                  {event.attendees.map((attendee) => {
                    const badge = attendee.responseStatus ? RESPONSE_BADGE[attendee.responseStatus] : undefined;
                    return (
                      <li key={attendee.email} className="flex items-center justify-between gap-2">
                        <span className="truncate text-ink-700">{attendee.name || attendee.email}</span>
                        {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {event.meetLink && (
              <a href={event.meetLink} target="_blank" rel="noreferrer" className="block">
                <Button variant="primary" className="w-full">
                  <Video size={14} />
                  Join with Google Meet
                </Button>
              </a>
            )}

            <a href={event.htmlLink} target="_blank" rel="noreferrer" className="block">
              <Button variant="outline" className="w-full">
                <ExternalLink size={14} />
                Open in Google Calendar
              </Button>
            </a>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
