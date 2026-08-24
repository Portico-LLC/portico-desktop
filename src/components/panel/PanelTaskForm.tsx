import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { taskSchema, STATUS_META, TASK_STATUSES, TASK_PRIORITIES, type TaskForm } from '@/lib/tasks';
import type { Task, Project } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

/** `<input type="date">` wants `yyyy-MM-dd`; the API returns a full ISO string. */
function toDateInputValue(iso?: string): string {
  return iso ? iso.slice(0, 10) : '';
}

/**
 * The panel's task editor, rendered inside a Dialog.
 *
 * Values come from `defaultValues` and the caller remounts this with
 * `key={task?.id ?? 'new'}` — deliberately, rather than the `reset()`-in-an-
 * effect pattern the main Tasks dialog uses. `Select` reads the native DOM
 * value once in a mount effect to derive its visible label, and child effects
 * run before parent ones, so a parent-side `reset()` lands too late and leaves
 * the trigger showing the previous task's status. Registration applies
 * `defaultValues` during the commit phase, before any effect, so this ordering
 * is correct by construction.
 *
 * Assignee is deliberately absent: reassigning needs the project's member list
 * (`/projects/:id/members`, as the main Tasks dialog fetches it), which is a
 * poor trade for a 320px-wide quick surface. That stays in the full app.
 */
export function PanelTaskForm({
  task,
  loading,
  onSubmit,
  onCancel,
  onDelete,
}: {
  task: Task | null;
  loading: boolean;
  onSubmit: (values: TaskForm) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? 'todo',
      priority: task?.priority ?? 'medium',
      dueDate: toDateInputValue(task?.dueDate),
      projectId: task?.projectId ?? '',
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects').then((res) => res.data),
    staleTime: 60_000,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="panel-task-title">Title</Label>
        <Input id="panel-task-title" autoFocus className="text-sm" {...register('title')} />
        {errors.title && <p className="text-xs text-terracotta-600">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="panel-task-description">Description</Label>
        <Textarea
          id="panel-task-description"
          rows={3}
          className="min-h-0 text-sm"
          {...register('description')}
        />
      </div>

      {/* Two-up from 380px — below that the panel is too narrow for side-by-side
          selects and they stack instead. */}
      <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="panel-task-status">Status</Label>
          <Select id="panel-task-status" {...register('status')}>
            {TASK_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_META[value].label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="panel-task-priority">Priority</Label>
          <Select id="panel-task-priority" {...register('priority')}>
            {TASK_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="panel-task-due">Due date</Label>
        <Input id="panel-task-due" type="date" className="text-sm" {...register('dueDate')} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="panel-task-project">Project</Label>
        <Select id="panel-task-project" {...register('projectId')}>
          <option value="">No project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        {task && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="focus-ring flex items-center gap-1.5 rounded-sm px-1 py-1 text-xs text-terracotta-600 transition-colors duration-hover ease-brand hover:text-terracotta-700"
          >
            <Trash2 size={13} />
            Delete
          </button>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={loading}>
            {loading ? 'Saving…' : task ? 'Save' : 'Create'}
          </Button>
        </div>
      </div>
    </form>
  );
}
