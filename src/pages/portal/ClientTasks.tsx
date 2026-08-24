import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, cleanPayload } from '@/lib/api';
import type { Task, Project, AssignableMember } from '@/lib/types';
import { KanbanBoard } from '@/components/KanbanBoard';
import { TaskNotes } from '@/components/TaskNotes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { CheckSquare, Calendar, Flag, Plus } from 'lucide-react';
import { format } from 'date-fns';

const taskSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
  projectId: z.string().min(1, 'Project is required'),
  assigneeId: z.string().optional(),
});
type TaskForm = z.infer<typeof taskSchema>;

const PRIORITY_META: Record<string, { label: string; variant: 'neutral' | 'pine' | 'ochre' | 'terracotta' }> = {
  low: { label: 'Low', variant: 'neutral' },
  medium: { label: 'Medium', variant: 'pine' },
  high: { label: 'High', variant: 'ochre' },
  urgent: { label: 'Urgent', variant: 'terracotta' },
};

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  review: 'Review',
  done: 'Done',
};

export function ClientTasks() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['client', 'tasks'],
    queryFn: () => api.get<Task[]>('/client/tasks').then((res) => res.data),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['client', 'projects'],
    queryFn: () => api.get<Project[]>('/client/projects').then((res) => res.data),
    enabled: dialogOpen,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TaskForm>({ resolver: zodResolver(taskSchema) });

  const selectedProjectId = watch('projectId');
  const selectedAssigneeId = watch('assigneeId');

  const { data: assignableMembers = [] } = useQuery({
    queryKey: ['client', 'project-members', selectedProjectId],
    queryFn: () =>
      api
        .get<AssignableMember[]>(`/client/projects/${selectedProjectId}/members`)
        .then((res) => (Array.isArray(res.data) ? res.data : [])),
    enabled: dialogOpen && !!selectedProjectId,
  });

  useEffect(() => {
    if (!selectedAssigneeId || !assignableMembers.length) return;
    if (!assignableMembers.some((m) => m.id === selectedAssigneeId)) setValue('assigneeId', '');
  }, [selectedProjectId, selectedAssigneeId, assignableMembers, setValue]);

  const createTask = useMutation({
    mutationFn: (payload: TaskForm) =>
      api.post('/client/tasks', cleanPayload(payload as Record<string, unknown>)).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['client', 'overview'] });
      setDialogOpen(false);
      reset();
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ id, ...payload }: Partial<Task> & { id: string }) =>
      api.patch(`/client/tasks/${id}`, payload).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['client', 'overview'] });
    },
  });

  const addNote = useMutation({
    mutationFn: ({ taskId, body }: { taskId: string; body: string }) =>
      api.post(`/client/tasks/${taskId}/notes`, { body }).then((res) => res.data),
    onSuccess: (note) => {
      queryClient.setQueryData<Task[]>(['client', 'tasks'], (current) =>
        (current ?? []).map((t) =>
          t.id === note.taskId ? { ...t, notes: [...(t.notes ?? []), note] } : t
        )
      );
      setSelected((prev) =>
        prev && prev.id === note.taskId
          ? { ...prev, notes: [...(prev.notes ?? []), note] }
          : prev
      );
    },
  });

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-semibold text-ink-900 mb-2">Tasks</h1>
          <p className="text-ink-500">Drag cards to update status, or click a task to view details and notes.</p>
        </div>
        <Button variant="primary" onClick={() => setDialogOpen(true)}>
          <Plus size={18} />
          New Task
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-ink-100 flex items-center justify-center mb-4">
              <CheckSquare size={20} className="text-ink-400" />
            </div>
            <h3 className="text-base font-semibold text-ink-900 mb-1">No tasks yet</h3>
            <p className="text-sm text-ink-400">Your team will add tasks to your projects.</p>
          </CardContent>
        </Card>
      ) : (
        <KanbanBoard
          tasks={tasks}
          onTaskClick={setSelected}
          onTaskUpdate={(updates) => updateTask.mutate(updates)}
        />
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 pr-8">
                  <DialogTitle className="truncate">{selected.title}</DialogTitle>
                  <Badge variant={PRIORITY_META[selected.priority]?.variant ?? 'neutral'} dot>
                    {PRIORITY_META[selected.priority]?.label ?? selected.priority}
                  </Badge>
                </div>
                <DialogDescription>
                  {selected.project?.name ?? 'No project'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {selected.description && (
                  <p className="text-sm text-ink-700 whitespace-pre-wrap">{selected.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-ink-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Flag size={13} className="text-ink-400" />
                    {STATUS_LABELS[selected.status] ?? selected.status}
                  </span>
                  {selected.dueDate && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={13} className="text-ink-400" />
                      Due {format(new Date(selected.dueDate), 'MMM d, yyyy')}
                    </span>
                  )}
                  {selected.assignee && <span>Assigned to {selected.assignee.name}</span>}
                </div>

                <div className="border-t border-ink-200 pt-4">
                  <TaskNotes
                    notes={selected.notes}
                    onAddNote={(body) => addNote.mutate({ taskId: selected.id, body })}
                    enableMentions={false}
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((data) => createTask.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-task-title">Title</Label>
              <Input id="client-task-title" placeholder="Task title" {...register('title')} />
              {errors.title && <p className="text-xs text-terracotta-600">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-task-desc">Description</Label>
              <textarea
                id="client-task-desc"
                className="flex min-h-[60px] w-full rounded-sm border border-ink-300 bg-bone-50 px-3 py-2 text-base placeholder:text-ink-400 focus:border-brass-500 focus:outline-none"
                placeholder="What needs to be done?"
                {...register('description')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-task-priority">Priority</Label>
                <Select id="client-task-priority" {...register('priority')}>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-task-due">Due Date</Label>
                <Input id="client-task-due" type="date" {...register('dueDate')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-task-project">Project</Label>
              <Select id="client-task-project" {...register('projectId')}>
                <option value="">Choose a project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              {errors.projectId && <p className="text-xs text-terracotta-600">{errors.projectId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-task-assignee">Assignee</Label>
              <Select id="client-task-assignee" disabled={!selectedProjectId} {...register('assigneeId')}>
                <option value="">Unassigned</option>
                {selectedProjectId &&
                  assignableMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.type === 'owner' ? `${m.name} (Owner)` : m.type === 'client' ? `${m.name} (You)` : m.name}
                    </option>
                  ))}
              </Select>
              {!selectedProjectId && (
                <p className="text-xs text-ink-400">Choose a project to assign this task to yourself, the studio, or a team member.</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDialogOpen(false);
                  reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? 'Creating…' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
