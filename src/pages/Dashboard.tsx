import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, cleanPayload } from '@/lib/api';
import type { Client, Project, Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';
import {
  TrendingUp,
  Clock,
  MessageCircle,
  Users,
  Briefcase,
  Plus,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const taskSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
  projectId: z.string().optional(),
});
type TaskForm = z.infer<typeof taskSchema>;

interface StatCardProps {
  label: string;
  value: number;
  hint: string;
  href: string;
  icon: React.ReactNode;
  tileClass: string;
  tileHoverClass: string;
}

function StatCard({ label, value, hint, href, icon, tileClass, tileHoverClass }: StatCardProps) {
  return (
    <Link to={href} className="group block rounded-lg focus-ring">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-ink-500 text-sm font-medium mb-2">{label}</p>
              <p className="text-3xl font-semibold text-ink-900 tabular-nums">{value}</p>
              <p className="text-xs text-ink-400 mt-2">{hint}</p>
            </div>
            <div
              className={cn(
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-sm transition-colors duration-hover ease-brand',
                tileClass,
                tileHoverClass
              )}
            >
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const isOwner = role === 'user';
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<Task[]>('/tasks').then((res) => res.data),
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects').then((res) => res.data),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<Client[]>('/clients').then((res) => res.data),
    enabled: isOwner,
  });

  const createTaskMutation = useMutation({
    mutationFn: (payload: TaskForm) =>
      api.post('/tasks', cleanPayload(payload as Record<string, unknown>)).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setTaskDialogOpen(false);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
  });

  const onSubmitTask = (data: TaskForm) => {
    createTaskMutation.mutate(data);
  };

  const isLoading = tasksLoading || projectsLoading;

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : 'there';

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const activeProjects = projects.filter(
    (p) => p.status !== 'completed' && p.status !== 'cancelled'
  );
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
  );
  const upcomingTasks = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) >= new Date() && t.status !== 'done'
  );
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const statusRows = [
    { key: 'in-progress', label: 'In progress', bar: 'bg-pine-600', dot: 'bg-pine-600' },
    { key: 'planning', label: 'Planning', bar: 'bg-brass-500', dot: 'bg-brass-500' },
    { key: 'paused', label: 'Paused', bar: 'bg-ochre-500', dot: 'bg-ochre-500' },
    { key: 'completed', label: 'Completed', bar: 'bg-moss-500', dot: 'bg-moss-500' },
    { key: 'cancelled', label: 'Cancelled', bar: 'bg-ink-300', dot: 'bg-ink-300' },
  ] as const;

  const statusCounts = statusRows.map((row) => ({
    ...row,
    count: projects.filter((p) => p.status === row.key).length,
  }));

  const quickActions = [
    { label: 'New Task', icon: Plus, action: () => setTaskDialogOpen(true) },
    ...(isOwner
      ? [
          { label: 'New Project', icon: Briefcase, action: () => navigate('/projects') },
          { label: 'New Client', icon: Users, action: () => navigate('/clients') },
        ]
      : []),
  ];

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mb-8 space-y-2">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-7 w-12 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brass-600 mb-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
          <h1 className="text-4xl font-display font-semibold text-ink-900 mb-2">
            {greeting}, {displayName}!
          </h1>
          <p className="text-ink-500">
            {activeProjects.length} active projects · {tasks.length} tasks · {overdueTasks.length} overdue
          </p>
        </div>
        <Button variant="primary" onClick={() => setTaskDialogOpen(true)}>
          <Plus size={18} />
          New Task
        </Button>
      </div>

      <div className={cn('grid grid-cols-1 gap-6 mb-8 md:grid-cols-2', isOwner ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
        <StatCard
          label="Active Projects"
          value={activeProjects.length}
          hint={`${projects.length} total projects`}
          href="/projects"
          icon={<TrendingUp size={20} />}
          tileClass="bg-pine-100 text-pine-700"
          tileHoverClass="group-hover:bg-pine-600 group-hover:text-bone-50"
        />
        <StatCard
          label="Upcoming Tasks"
          value={upcomingTasks.length}
          hint="Due this week"
          href="/tasks"
          icon={<Clock size={20} />}
          tileClass="bg-brass-100 text-brass-700"
          tileHoverClass="group-hover:bg-brass-500 group-hover:text-bone-50"
        />
        <StatCard
          label="Overdue Tasks"
          value={overdueTasks.length}
          hint="Need attention"
          href="/tasks"
          icon={<MessageCircle size={20} />}
          tileClass="bg-terracotta-100 text-terracotta-700"
          tileHoverClass="group-hover:bg-terracotta-500 group-hover:text-bone-50"
        />
        {isOwner && (
          <StatCard
            label="Active Clients"
            value={clients.length}
            hint="Total in workspace"
            href="/clients"
            icon={<Users size={20} />}
            tileClass="bg-moss-100 text-moss-700"
            tileHoverClass="group-hover:bg-moss-600 group-hover:text-bone-50"
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Projects</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
                View all
                <ExternalLink size={14} className="ml-1.5" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeProjects.length === 0 ? (
                  <p className="text-sm text-ink-400 py-4">No active projects yet.</p>
                ) : (
                  activeProjects.slice(0, 5).map((project) => (
                    <div key={project.id} className="border-b border-ink-200 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-ink-900">{project.name}</p>
                          {project.client && (
                            <p className="text-sm text-ink-400">{project.client.name}</p>
                          )}
                        </div>
                        <Badge
                          variant={
                            project.status === 'completed'
                              ? 'moss'
                              : project.status === 'in-progress'
                              ? 'pine'
                              : project.status === 'paused'
                              ? 'ochre'
                              : 'neutral'
                          }
                        >
                          {project.status?.replace(/-/g, ' ') || 'Planning'}
                        </Badge>
                      </div>
                      {project.progress != null && (
                        <div className="w-full bg-ink-200 rounded-full h-2 mb-1">
                          <div
                            className="bg-pine-600 h-2 rounded-full transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      )}
                      {project.progress != null && (
                        <p className="text-xs text-ink-400">{project.progress}% complete</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTasks.length === 0 ? (
                <p className="text-sm text-ink-400 py-4">No tasks yet.</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-[3px] top-2 bottom-2 w-px bg-ink-200" />
                  <div className="space-y-5">
                    {recentTasks.map((task) => (
                      <div key={task.id} className="relative pl-6">
                        <span className="absolute left-0 top-1 h-[7px] w-[7px] rounded-full bg-pine-600 ring-2 ring-bone-50" />
                        <p className="text-sm font-medium text-ink-900">{task.title}</p>
                        <p className="text-xs text-ink-400">
                          {new Date(task.createdAt).toLocaleDateString()} ·{' '}
                          {task.status?.replace(/-/g, ' ') ?? 'todo'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingTasks.length === 0 ? (
                  <p className="text-sm text-ink-400 py-4">No upcoming tasks.</p>
                ) : (
                  upcomingTasks
                    .sort(
                      (a, b) =>
                        new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
                    )
                    .slice(0, 5)
                    .map((task) => (
                      <div
                        key={task.id}
                        className="border-l-2 border-brass-500 pl-3 py-2"
                      >
                        <p className="text-sm font-medium text-ink-900">{task.title}</p>
                        <p className="text-xs text-ink-400">
                          {task.dueDate
                            ? format(new Date(task.dueDate), 'EEE, MMM d')
                            : ''}
                        </p>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Projects by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-ink-100">
                {statusCounts
                  .filter((s) => s.count > 0)
                  .map((s) => (
                    <div
                      key={s.key}
                      className={cn('h-full', s.bar)}
                      style={{ width: `${(s.count / Math.max(projects.length, 1)) * 100}%` }}
                    />
                  ))}
              </div>
              <div className="mt-4 space-y-2">
                {statusCounts.map((s) => (
                  <div key={s.key} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-ink-600">
                      <span className={cn('h-2 w-2 rounded-full', s.dot)} />
                      {s.label}
                    </span>
                    <span className="font-medium text-ink-900 tabular-nums">{s.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {quickActions.map(({ label, icon: Icon, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="group flex w-full items-center justify-between rounded-sm border border-ink-200 bg-bone-50 px-3 py-2.5 text-sm font-medium text-ink-900 transition-all duration-hover ease-brand hover:border-ink-300 hover:bg-ink-100"
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon
                        size={16}
                        className="text-ink-500 transition-colors duration-hover ease-brand group-hover:text-pine-700"
                      />
                      {label}
                    </span>
                    <ChevronRight
                      size={16}
                      className="text-ink-300 transition-all duration-hover ease-brand group-hover:translate-x-0.5 group-hover:text-brass-600"
                    />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((data) => {
              onSubmitTask(data);
              reset();
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
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setTaskDialogOpen(false);
                  reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTaskMutation.isPending}>
                {createTaskMutation.isPending ? 'Creating…' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
