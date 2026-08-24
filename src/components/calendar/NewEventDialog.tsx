import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Video } from 'lucide-react';
import { api, cleanPayload, getErrorMessage } from '@/lib/api';
import type { AssignableMember, Project } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  projectId: z.string().optional(),
  location: z.string().optional(),
  start: z.string().min(1, 'Start time is required'),
  end: z.string().min(1, 'End time is required'),
  addMeetLink: z.boolean().optional(),
});
type EventForm = z.infer<typeof eventSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewEventDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [attendees, setAttendees] = useState<AssignableMember[]>([]);
  const endTouchedRef = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: { addMeetLink: true },
  });

  const projectId = watch('projectId');
  const start = watch('start');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects').then((res) => res.data),
    enabled: open,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () =>
      api
        .get<AssignableMember[]>(`/projects/${projectId}/members`)
        .then((res) => (Array.isArray(res.data) ? res.data : [])),
    enabled: open && !!projectId,
  });

  useEffect(() => {
    setAttendees([]);
  }, [projectId]);

  useEffect(() => {
    if (!open) {
      reset({ addMeetLink: true });
      setAttendees([]);
      endTouchedRef.current = false;
    }
  }, [open, reset]);

  useEffect(() => {
    if (!start || endTouchedRef.current) return;
    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) return;
    const end = new Date(startDate.getTime() + 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const local = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
    setValue('end', local);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);

  const createMutation = useMutation({
    mutationFn: (data: EventForm) =>
      api.post(
        '/integrations/google-calendar/events',
        cleanPayload({
          title: data.title,
          description: data.description,
          location: data.location,
          start: new Date(data.start).toISOString(),
          end: new Date(data.end).toISOString(),
          addMeetLink: data.addMeetLink,
          projectId: data.projectId,
          attendees: attendees.map((m) => ({ email: m.email!, name: m.name })),
        } as Record<string, unknown>),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-events'] });
      onOpenChange(false);
    },
  });

  const availableMembers = members.filter(
    (m) => !!m.email && !attendees.some((a) => a.id === m.id),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-title">Title</Label>
            <Input id="event-title" placeholder="Event title" {...register('title')} />
            {errors.title && <p className="text-xs text-terracotta-600">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-desc">Description</Label>
            <textarea
              id="event-desc"
              className="flex min-h-[60px] w-full rounded-sm border border-ink-300 bg-bone-50 px-3 py-2 text-base placeholder:text-ink-400 focus:border-brass-500 focus:outline-none"
              placeholder="What's this meeting about?"
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-start">Start</Label>
              <Input id="event-start" type="datetime-local" {...register('start')} />
              {errors.start && <p className="text-xs text-terracotta-600">{errors.start.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end">End</Label>
              <Input
                id="event-end"
                type="datetime-local"
                {...register('end', { onChange: () => (endTouchedRef.current = true) })}
              />
              {errors.end && <p className="text-xs text-terracotta-600">{errors.end.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-location">Location</Label>
            <Input id="event-location" placeholder="Optional" {...register('location')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-project">Project</Label>
            <Select id="event-project" {...register('projectId')}>
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Attendees</Label>
            {attendees.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {attendees.map((a) => (
                  <Badge key={a.id} variant="neutral" className="gap-1 pr-1">
                    {a.name}
                    <button
                      type="button"
                      onClick={() => setAttendees((prev) => prev.filter((m) => m.id !== a.id))}
                      className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-ink-900/10"
                      title="Remove attendee"
                    >
                      <X size={11} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {!projectId ? (
              <p className="text-xs text-ink-400">Choose a project to invite its team or client.</p>
            ) : availableMembers.length > 0 ? (
              <Select
                key={attendees.length}
                defaultValue=""
                onChange={(e) => {
                  const member = members.find((m) => m.id === e.target.value);
                  if (member) setAttendees((prev) => [...prev, member]);
                }}
              >
                <option value="" disabled>
                  Add an attendee…
                </option>
                {availableMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.type === 'owner' ? `${m.name} (Owner)` : m.type === 'client' ? `${m.name} (Client)` : m.name}
                  </option>
                ))}
              </Select>
            ) : (
              <p className="text-xs text-ink-400">No one else on this project has an email on file to invite.</p>
            )}
          </div>

          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded-sm border-ink-300 bg-bone-50 accent-brass-600 focus:ring-2 focus:ring-brass-200"
              {...register('addMeetLink')}
            />
            <Video size={14} className="text-ink-400" />
            Add Google Meet video call
          </label>

          {createMutation.isError && (
            <p className="text-sm text-terracotta-600">{getErrorMessage(createMutation.error)}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
