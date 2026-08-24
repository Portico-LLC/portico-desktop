import { useMemo, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, ListChecks, Plus } from 'lucide-react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { api, cleanPayload } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { motionTransition, springs } from '@/lib/motion/springs';
import { sortByDueDate, TASK_TITLE_MIN_LENGTH, type TaskForm } from '@/lib/tasks';
import type { Task } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { PanelListRow, PanelEmptyState, PanelSkeletonList } from '@/components/panel/PanelListPrimitives';
import { TaskStatusMenu } from '@/components/panel/TaskStatusMenu';
import { PanelTaskForm } from '@/components/panel/PanelTaskForm';

// Every Dialog inside the panel needs this: PanelFrame already applies a
// backdrop-filter to the whole window, and the dialog overlay's default
// `backdrop-blur-sm` stacks a second blur on top of it, which reads as muddy
// rather than layered. Same override VaultTab uses.
const PANEL_OVERLAY = 'backdrop-blur-none bg-ink-950/60';

const PANEL_TASK_LIMIT = 50;

type Scope = 'mine' | 'all';

function dueBadge(dueDate?: string) {
  if (!dueDate) return null;
  const date = parseISO(dueDate);
  if (isPast(date) && !isToday(date)) return <Badge variant="terracotta">Overdue</Badge>;
  if (isToday(date)) return <Badge variant="ochre">Today</Badge>;
  return <Badge variant="outline">{format(date, 'MMM d')}</Badge>;
}

/** Mine / All, as a two-pill segmented control with a sliding indicator. */
function ScopeSwitch({
  scope,
  onChange,
  reduce,
}: {
  scope: Scope;
  onChange: (next: Scope) => void;
  reduce: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Task scope"
      className="flex items-center gap-0.5 rounded-full bg-ink-100 p-0.5"
    >
      {(['mine', 'all'] as Scope[]).map((value) => {
        const active = scope === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(value)}
            className={cn(
              'focus-ring relative rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-colors duration-hover ease-brand',
              active ? 'text-bone-50' : 'text-ink-500 hover:text-ink-900'
            )}
          >
            {active && (
              <motion.span
                layoutId="panel-task-scope"
                className="absolute inset-0 rounded-full bg-pine-900"
                transition={motionTransition(reduce, springs.snappy)}
              />
            )}
            <span className="relative z-10">{value}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TasksTab() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const reduce = !!useReducedMotion();

  const [scope, setScope] = useState<Scope>('mine');
  const [draftTitle, setDraftTitle] = useState('');
  const [doneOpen, setDoneOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<Task[]>('/tasks').then((res) => res.data),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  /**
   * Status changes are the panel's highest-frequency action, and a floating
   * window that waits on a round-trip before the pill recolours reads as broken.
   * Patch the cache first, roll back if the request fails.
   */
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Task['status'] }) =>
      api.patch(`/tasks/${id}`, { status }).then((res) => res.data),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData<Task[]>(['tasks']);
      queryClient.setQueryData<Task[]>(['tasks'], (current) =>
        (current ?? []).map((t) => (t.id === id ? { ...t, status } : t))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['tasks'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const createTask = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post('/tasks', cleanPayload(payload)).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setFormOpen(false);
      setEditingTask(null);
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      api.patch(`/tasks/${id}`, payload).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setFormOpen(false);
      setEditingTask(null);
    },
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setDeleteTaskId(null);
      setFormOpen(false);
      setEditingTask(null);
    },
  });

  const { open, done } = useMemo(() => {
    const scoped =
      scope === 'mine' ? tasks.filter((t) => t.assigneeId === currentUser?.id) : tasks;
    return {
      open: scoped.filter((t) => t.status !== 'done').sort(sortByDueDate).slice(0, PANEL_TASK_LIMIT),
      done: scoped.filter((t) => t.status === 'done').slice(0, PANEL_TASK_LIMIT),
    };
  }, [tasks, scope, currentUser?.id]);

  const canQuickAdd = draftTitle.trim().length >= TASK_TITLE_MIN_LENGTH;

  const submitQuickAdd = () => {
    if (!canQuickAdd || createTask.isPending) return;
    createTask.mutate({
      title: draftTitle.trim(),
      // Without this a task created while scoped to Mine would save and then
      // immediately drop out of the list you created it from.
      assigneeId: currentUser?.id,
    });
    setDraftTitle('');
  };

  /**
   * Empty strings mean "cleared" here, and `cleanPayload` would strip them —
   * which is exactly why the main app can't remove a due date once set. Send an
   * explicit null for those instead; `@IsOptional()` on the DTO skips
   * validation for null, so no backend change is needed.
   */
  const submitForm = (values: TaskForm) => {
    if (editingTask) {
      const payload: Record<string, unknown> = {
        title: values.title,
        status: values.status,
        priority: values.priority,
        description: values.description?.trim() ? values.description : null,
        dueDate: values.dueDate ? values.dueDate : null,
        projectId: values.projectId ? values.projectId : null,
      };
      updateTask.mutate({ id: editingTask.id, payload });
      return;
    }
    createTask.mutate({ ...values, assigneeId: currentUser?.id });
  };

  const openEditor = (task: Task | null) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const renderRow = (task: Task, index: number) => (
    <PanelListRow
      as="div"
      key={task.id}
      index={index}
      role="button"
      tabIndex={0}
      onClick={() => openEditor(task)}
      onKeyDown={(e: ReactKeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openEditor(task);
        }
      }}
      className="select-none"
    >
      <input
        type="checkbox"
        checked={task.status === 'done'}
        aria-label={task.status === 'done' ? 'Mark as to do' : 'Mark as done'}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) =>
          setStatus.mutate({ id: task.id, status: e.target.checked ? 'done' : 'todo' })
        }
        className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-sm border-ink-300 bg-bone-50 accent-brass-600 focus:ring-2 focus:ring-brass-200"
      />
      <div className="min-w-0 flex-1">
        {/* Title gets its own full-width line so it has room to truncate into —
            sharing the line with the status pill leaves ~190px at 320px wide. */}
        <p
          className={cn(
            'truncate text-sm',
            task.status === 'done' ? 'text-ink-400 line-through' : 'text-ink-900'
          )}
        >
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <TaskStatusMenu
            status={task.status}
            onChange={(status) => setStatus.mutate({ id: task.id, status })}
          />
          {task.project && (
            <span className="truncate text-[11px] text-ink-400">{task.project.name}</span>
          )}
          {dueBadge(task.dueDate)}
        </div>
      </div>
    </PanelListRow>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Controls stay pinned so create is reachable however long the list is. */}
      <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-ink-100 px-3 py-2">
        <ScopeSwitch scope={scope} onChange={setScope} reduce={reduce} />
        <Button variant="ghost" size="icon" title="New task" onClick={() => openEditor(null)}>
          <Plus size={16} />
        </Button>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2 border-b border-ink-100 px-3 py-1.5">
        <Plus size={14} className="flex-shrink-0 text-ink-400" />
        <input
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitQuickAdd();
            if (e.key === 'Escape') setDraftTitle('');
          }}
          placeholder="Add a task…"
          aria-label="Quick-add a task"
          className="min-w-0 flex-1 bg-transparent py-1 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
        />
        {draftTitle.trim().length > 0 && (
          <button
            type="button"
            onClick={submitQuickAdd}
            disabled={!canQuickAdd || createTask.isPending}
            className="focus-ring flex-shrink-0 rounded-sm px-2 py-1 text-[11px] font-medium text-pine-900 transition-colors duration-hover ease-brand hover:bg-ink-100 disabled:opacity-40"
          >
            Add
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading ? (
          <PanelSkeletonList count={5} />
        ) : open.length === 0 && done.length === 0 ? (
          <PanelEmptyState
            icon={<ListChecks className="h-6 w-6 text-ink-300" />}
            message={scope === 'mine' ? 'Nothing assigned to you right now.' : 'No tasks yet.'}
          />
        ) : (
          <>
            <div className="divide-y divide-ink-100">{open.map(renderRow)}</div>

            {done.length > 0 && (
              <div className="border-t border-ink-100">
                <button
                  type="button"
                  onClick={() => setDoneOpen((v) => !v)}
                  aria-expanded={doneOpen}
                  className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[11px] font-medium text-ink-500 transition-colors duration-hover ease-brand hover:bg-ink-50 hover:text-ink-900"
                >
                  <ChevronRight
                    size={12}
                    className={cn(
                      'transition-transform duration-hover ease-brand',
                      doneOpen && 'rotate-90'
                    )}
                  />
                  Done ({done.length})
                </button>
                {doneOpen && <div className="divide-y divide-ink-100">{done.map(renderRow)}</div>}
              </div>
            )}
          </>
        )}
      </div>

      <Dialog
        open={formOpen}
        onOpenChange={(next) => {
          setFormOpen(next);
          if (!next) setEditingTask(null);
        }}
      >
        <DialogContent overlayClassName={PANEL_OVERLAY}>
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
          </DialogHeader>
          <PanelTaskForm
            // Remounts per task so the form's defaultValues are applied during
            // registration — see the note in PanelTaskForm on why a reset() in
            // an effect would leave Select's label showing the previous task.
            key={editingTask?.id ?? 'new'}
            task={editingTask}
            loading={createTask.isPending || updateTask.isPending}
            onSubmit={submitForm}
            onCancel={() => setFormOpen(false)}
            onDelete={editingTask ? () => setDeleteTaskId(editingTask.id) : undefined}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTaskId}
        onOpenChange={(next) => !next && setDeleteTaskId(null)}
        title="Delete task"
        description="This will permanently remove this task. This action cannot be undone."
        loading={deleteTask.isPending}
        onConfirm={() => deleteTaskId && deleteTask.mutate(deleteTaskId)}
        overlayClassName={PANEL_OVERLAY}
      />
    </div>
  );
}
