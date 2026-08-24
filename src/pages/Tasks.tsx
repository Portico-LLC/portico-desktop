import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, cleanPayload } from '@/lib/api';
import type { Task, Project, AssignableMember } from '@/lib/types';
import { KanbanBoard } from '@/components/KanbanBoard';
import { TaskNotes } from '@/components/TaskNotes';
import { SubtaskList } from '@/components/tasks/SubtaskList';
import { DependencyPicker } from '@/components/tasks/DependencyPicker';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog';
import { Search, Plus, Table, LayoutGrid, Filter, Calendar, MoreHorizontal, CheckSquare, X, Pencil, Trash2 } from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { taskSchema, type TaskForm } from '@/lib/tasks';

type ViewMode = 'kanban' | 'table';

function TaskRowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <Button
        variant="ghost"
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={14} />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-50 w-36 animate-fade-up overflow-hidden rounded-md border border-ink-200 bg-bone-50 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-700 transition-colors duration-hover ease-brand hover:bg-ink-100 hover:text-ink-900"
          >
            <Pencil size={14} className="text-ink-400" />
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-terracotta-600 transition-colors duration-hover ease-brand hover:bg-terracotta-500/10 hover:text-terracotta-700"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}


export function Tasks() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const currentUser = useAuthStore((s) => s.user);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const filtersRef = useRef<HTMLDivElement>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<Task[]>('/tasks').then((res) => res.data),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects').then((res) => res.data),
    enabled: dialogOpen || filtersOpen,
  });

  useEffect(() => {
    const linkedTaskId = searchParams.get('task');
    if (!linkedTaskId || detailTask) return;
    const match = tasks.find((t) => t.id === linkedTaskId);
    if (match) setDetailTask(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, searchParams]);

  // Lets the command palette's "New task" quick action open this page's own create dialog.
  useEffect(() => {
    if (searchParams.get('new') === '1') setDialogOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [filtersOpen]);

  const createMutation = useMutation({
    mutationFn: (payload: TaskForm) =>
      api.post('/tasks', cleanPayload(payload as Record<string, unknown>)).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setDialogOpen(false);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, ...updates }: Partial<Task> & { id: string }) =>
      api.patch(`/tasks/${id}`, cleanPayload(updates as Record<string, unknown>)).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const createSubtaskMutation = useMutation({
    mutationFn: (payload: { title: string; projectId?: string; clientId?: string; parentTaskId: string }) =>
      api.post('/tasks', cleanPayload(payload as Record<string, unknown>)).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const addNoteMutation = useMutation({
    mutationFn: ({ taskId, body }: { taskId: string; body: string }) =>
      api
        .post(`/tasks/${taskId}/notes`, {
          body,
          authorType: 'team',
          authorName:
            currentUser?.name ||
            [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') ||
            'Team',
        })
        .then((res) => res.data),
    onSuccess: (note) => {
      queryClient.setQueryData<Task[]>(['tasks'], (current) =>
        (current ?? []).map((t) =>
          t.id === note.taskId ? { ...t, notes: [...(t.notes ?? []), note] } : t
        )
      );
      setDetailTask((prev) =>
        prev && prev.id === note.taskId
          ? { ...prev, notes: [...(prev.notes ?? []), note] }
          : prev
      );
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
  });

  const selectedProjectId = watch('projectId');
  const selectedAssigneeId = watch('assigneeId');

  const { data: assignableMembers = [] } = useQuery({
    queryKey: ['project-members', selectedProjectId],
    // Guards against a stale/mismatched backend deploy still returning the old
    // `{owner, employees}` shape instead of a flat array — better an empty
    // assignee list than a hard crash on `.map`.
    queryFn: () =>
      api
        .get<AssignableMember[]>(`/projects/${selectedProjectId}/members`)
        .then((res) => (Array.isArray(res.data) ? res.data : [])),
    enabled: dialogOpen && !!selectedProjectId,
  });

  useEffect(() => {
    if (!selectedAssigneeId) return;
    if (!selectedProjectId) {
      setValue('assigneeId', '');
      return;
    }
    if (!assignableMembers.length) return;
    if (!assignableMembers.some((m) => m.id === selectedAssigneeId)) setValue('assigneeId', '');
  }, [selectedProjectId, selectedAssigneeId, assignableMembers, setValue]);

  // Populates the New/Edit Task dialog's form when opened for editing — cleared back to
  // blank defaults when opened for creating instead.
  useEffect(() => {
    if (!dialogOpen) return;
    if (editingTask) {
      reset({
        title: editingTask.title,
        description: editingTask.description,
        priority: editingTask.priority,
        dueDate: editingTask.dueDate ? editingTask.dueDate.slice(0, 10) : undefined,
        projectId: editingTask.projectId,
        assigneeId: editingTask.assigneeId,
      });
    } else {
      reset({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, editingTask]);

  const filteredTasks = tasks
    .filter(
      (t) =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
    )
    .filter((t) => !statusFilter || t.status === statusFilter)
    .filter((t) => !priorityFilter || t.priority === priorityFilter)
    .filter((t) => !projectFilter || t.projectId === projectFilter);

  const activeFilterCount = [statusFilter, priorityFilter, projectFilter].filter(Boolean).length;

  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setProjectFilter('');
  };

  const updateTaskStatus = (task: Task, status: Task['status']) => {
    updateTaskMutation.mutate({ id: task.id, status });
  };

  const onSubmitTask = (data: TaskForm) => {
    if (editingTask) {
      updateTaskMutation.mutate(
        { id: editingTask.id, ...data },
        {
          onSuccess: () => {
            setDialogOpen(false);
            setEditingTask(null);
            reset();
          },
        }
      );
    } else {
      createMutation.mutate(data);
      reset();
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-semibold text-ink-900 mb-2">Tasks</h1>
          <p className="text-ink-500">Track and manage your team's work.</p>
        </div>
        <Button variant="primary" onClick={() => setDialogOpen(true)}>
          <Plus size={18} />
          New Task
        </Button>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
            <Input
              placeholder="Search tasks..."
              className="pl-10 w-72"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'kanban' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid size={16} className="mr-1.5" />
              Kanban
            </Button>
            <Button
              variant={viewMode === 'table' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <Table size={16} className="mr-1.5" />
              Table
            </Button>
          </div>
        </div>

        <div className="relative" ref={filtersRef}>
          <Button variant="secondary" size="sm" onClick={() => setFiltersOpen((o) => !o)}>
            <Filter size={16} className="mr-1.5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="brass" className="ml-1.5 h-4 min-w-4 justify-center px-1">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {filtersOpen && (
            <div className="absolute right-0 z-30 mt-2 w-72 origin-top-right rounded-sm border border-ink-300 bg-bone-50/90 p-4 shadow-md backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-ink-900">Filter tasks</span>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-xs text-ink-400 hover:text-terracotta-600"
                  >
                    <X size={12} />
                    Clear all
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="filter-status">Status</Label>
                  <Select
                    id="filter-status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All statuses</option>
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-priority">Priority</Label>
                  <Select
                    id="filter-priority"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                  >
                    <option value="">All priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-project">Project</Label>
                  <Select
                    id="filter-project"
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                  >
                    <option value="">All projects</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <KanbanBoard
          tasks={filteredTasks}
          onTaskClick={setDetailTask}
          onTaskEdit={(task) => {
            setEditingTask(task);
            setDialogOpen(true);
          }}
          onTaskUpdate={(updates) => {
            updateTaskMutation.mutate(updates);
          }}
          onTaskDelete={(taskId) => setDeleteTaskId(taskId)}
        />
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Tasks</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-50">
                  <tr>
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink-600">
                      Task
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink-600">
                      Project
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink-600">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink-600">
                      Assignee
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink-600">
                      Due Date
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink-600">
                      Priority
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-ink-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      className="hover:bg-ink-50 cursor-pointer"
                      onClick={() => setDetailTask(task)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CheckSquare className="h-4 w-4 text-ink-300" />
                          <div>
                            <p className="font-medium text-ink-900">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-ink-400 line-clamp-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {task.project ? (
                          <Badge variant="pine">{task.project.name}</Badge>
                        ) : (
                          <span className="text-xs text-ink-400">No project</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="text-xs text-ink-700 bg-transparent border-none cursor-pointer"
                          value={task.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            updateTaskStatus(
                              task,
                              e.target.value as Task['status']
                            )
                          }
                        >
                          <option value="todo">To Do</option>
                          <option value="in-progress">In Progress</option>
                          <option value="review">Review</option>
                          <option value="done">Done</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {task.assignee ? (
                          <Avatar name={task.assignee.name} />
                        ) : (
                          <span className="text-xs text-ink-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {task.dueDate ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Calendar size={12} className="text-ink-300" />
                            {format(new Date(task.dueDate), 'MMM d, yyyy')}
                          </div>
                        ) : (
                          <span className="text-xs text-ink-400">No due date</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            task.priority === 'urgent'
                              ? 'terracotta'
                              : task.priority === 'high'
                              ? 'ochre'
                              : task.priority === 'medium'
                              ? 'pine'
                              : 'neutral'
                          }
                          dot
                        >
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <TaskRowActions
                          onEdit={() => {
                            setEditingTask(task);
                            setDialogOpen(true);
                          }}
                          onDelete={() => setDeleteTaskId(task.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredTasks.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CheckSquare className="mx-auto h-8 w-8 text-ink-300 mb-3" />
              <p className="text-ink-500">
                {search ? 'No tasks match your search.' : 'No tasks yet. Create your first task to get started.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New/Edit Task Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTask(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((data) => {
              onSubmitTask(data);
            })}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input id="task-title" placeholder="Task title" {...register('title')} />
              {errors.title && (
                <p className="text-xs text-terracotta-600">{errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-desc">Description</Label>
              <textarea
                id="task-desc"
                className="flex min-h-[60px] w-full rounded-sm border border-ink-300 bg-bone-50 px-3 py-2 text-base placeholder:text-ink-400 focus:border-brass-500 focus:outline-none"
                placeholder="What needs to be done?"
                {...register('description')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-priority">Priority</Label>
                <Select id="task-priority" {...register('priority')}>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due">Due Date</Label>
                <Input id="task-due" type="date" {...register('dueDate')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-project">Project</Label>
              <Select id="task-project" {...register('projectId')}>
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-assignee">Assignee</Label>
              <Select id="task-assignee" disabled={!selectedProjectId} {...register('assigneeId')}>
                <option value="">Unassigned</option>
                {selectedProjectId &&
                  assignableMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.type === 'owner' ? `${m.name} (Owner)` : m.name}
                    </option>
                  ))}
              </Select>
              {!selectedProjectId && (
                <p className="text-xs text-ink-400">Choose a project to assign this task to a team member.</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingTask(null);
                  reset();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={editingTask ? updateTaskMutation.isPending : createMutation.isPending}
              >
                {editingTask
                  ? updateTaskMutation.isPending
                    ? 'Saving…'
                    : 'Save Changes'
                  : createMutation.isPending
                    ? 'Creating…'
                    : 'Create Task'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog open={!!detailTask} onOpenChange={(open) => !open && setDetailTask(null)}>
        <DialogContent className="max-w-xl">
          {detailTask && (
            <>
              <DialogHeader>
                <DialogTitle className="truncate pr-8">{detailTask.title}</DialogTitle>
                <DialogDescription>
                  {detailTask.project?.name ?? 'No project'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {detailTask.description && (
                  <p className="text-sm text-ink-700 whitespace-pre-wrap">{detailTask.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-ink-500">
                  <Badge
                    variant={
                      detailTask.priority === 'urgent'
                        ? 'terracotta'
                        : detailTask.priority === 'high'
                        ? 'ochre'
                        : detailTask.priority === 'medium'
                        ? 'pine'
                        : 'neutral'
                    }
                    dot
                  >
                    {detailTask.priority}
                  </Badge>
                  {detailTask.dueDate && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={13} className="text-ink-400" />
                      Due {format(new Date(detailTask.dueDate), 'MMM d, yyyy')}
                    </span>
                  )}
                  {detailTask.assignee && <span>Assigned to {detailTask.assignee.name}</span>}
                  {detailTask.client?.name && <span>Client: {detailTask.client.name}</span>}
                </div>

                {detailTask.projectId && (
                  <div className="border-t border-ink-200 pt-4">
                    <DependencyPicker
                      task={detailTask}
                      candidateTasks={tasks.filter((t) => t.projectId === detailTask.projectId)}
                    />
                  </div>
                )}

                <div className="border-t border-ink-200 pt-4">
                  <SubtaskList
                    subtasks={tasks.filter((t) => t.parentTaskId === detailTask.id)}
                    onAdd={(title) =>
                      createSubtaskMutation.mutate({
                        title,
                        projectId: detailTask.projectId,
                        clientId: detailTask.clientId,
                        parentTaskId: detailTask.id,
                      })
                    }
                    onToggleDone={(subtask) =>
                      updateTaskMutation.mutate({ id: subtask.id, status: subtask.status === 'done' ? 'todo' : 'done' })
                    }
                  />
                </div>

                <div className="border-t border-ink-200 pt-4">
                  <TaskNotes
                    notes={detailTask.notes}
                    onAddNote={(body) => addNoteMutation.mutate({ taskId: detailTask.id, body })}
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTaskId}
        onOpenChange={(open) => { if (!open) setDeleteTaskId(null); }}
        title="Delete task"
        description="This will permanently remove this task. This action cannot be undone."
        loading={deleteTaskMutation.isPending}
        onConfirm={() => {
          if (deleteTaskId) {
            deleteTaskMutation.mutate(deleteTaskId, { onSuccess: () => setDeleteTaskId(null) });
          }
        }}
      />
    </div>
  );
}