import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Project, Task } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { KanbanBoard } from '@/components/KanbanBoard';
import { ArrowLeft, Briefcase } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_META: Record<string, { label: string; variant: 'neutral' | 'pine' | 'moss' | 'ochre' | 'terracotta' }> = {
  planning: { label: 'Planning', variant: 'neutral' },
  'in-progress': { label: 'In Progress', variant: 'pine' },
  active: { label: 'Active', variant: 'pine' },
  completed: { label: 'Completed', variant: 'moss' },
  'on-hold': { label: 'On Hold', variant: 'ochre' },
  cancelled: { label: 'Cancelled', variant: 'terracotta' },
};

export function ClientProjectDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['client', 'projects'],
    queryFn: () => api.get<Project[]>('/client/projects').then((res) => res.data),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['client', 'tasks'],
    queryFn: () => api.get<Task[]>('/client/tasks').then((res) => res.data),
  });

  const updateTask = useMutation({
    mutationFn: ({ id, ...payload }: Partial<Task> & { id: string }) =>
      api.patch(`/client/tasks/${id}`, payload).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['client', 'overview'] });
    },
  });

  const project = projects?.find((p) => p.id === id);
  const projectTasks = tasks.filter((t) => t.project?.id === id);

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-ink-400">Project not found.</p>
            <Link to="/portal/projects" className="mt-4 text-sm font-medium text-pine-700 hover:text-pine-900">
              Back to projects
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const meta = STATUS_META[project.status ?? ''] ?? STATUS_META.planning;
  const doneCount = projectTasks.filter((t) => t.status === 'done').length;
  const progress = projectTasks.length === 0 ? 0 : Math.round((doneCount / projectTasks.length) * 100);

  return (
    <div className="p-8">
      <Link
        to="/portal/projects"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-pine-700 hover:text-pine-900 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to projects
      </Link>

      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-md bg-pine-100 flex items-center justify-center flex-shrink-0">
                <Briefcase size={18} className="text-pine-700" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-display font-semibold text-ink-900 truncate">{project.name}</h1>
                {project.dueDate && (
                  <p className="text-xs text-ink-400">
                    Due {format(new Date(project.dueDate), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
            <Badge variant={meta.variant} dot>
              {meta.label}
            </Badge>
          </div>
          <p className="text-sm text-ink-600 mb-4">{project.description || 'No description provided.'}</p>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-ink-400">{doneCount} of {projectTasks.length} tasks done</span>
            <span className="font-medium text-ink-600">{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-ink-100 overflow-hidden">
            <div className="h-full rounded-full bg-brass-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </CardContent>
      </Card>

      <h2 className="mb-4 text-lg font-semibold text-ink-900">Tasks</h2>
      {projectTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-ink-400">No tasks for this project yet.</p>
          </CardContent>
        </Card>
      ) : (
        <KanbanBoard
          tasks={projectTasks}
          onTaskUpdate={(updates) => updateTask.mutate(updates)}
        />
      )}
    </div>
  );
}
