import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Project, Task } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Briefcase, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_META: Record<string, { label: string; variant: 'neutral' | 'pine' | 'moss' | 'ochre' | 'terracotta' }> = {
  planning: { label: 'Planning', variant: 'neutral' },
  'in-progress': { label: 'In Progress', variant: 'pine' },
  active: { label: 'Active', variant: 'pine' },
  completed: { label: 'Completed', variant: 'moss' },
  'on-hold': { label: 'On Hold', variant: 'ochre' },
  cancelled: { label: 'Cancelled', variant: 'terracotta' },
};

export function ClientProjects() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['client', 'projects'],
    queryFn: () => api.get<Project[]>('/client/projects').then((res) => res.data),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['client', 'tasks'],
    queryFn: () => api.get<Task[]>('/client/tasks').then((res) => res.data),
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-semibold text-ink-900 mb-2">Projects</h1>
        <p className="text-ink-500">Track progress across your projects.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : !projects || projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-ink-100 flex items-center justify-center mb-4">
              <Briefcase size={20} className="text-ink-400" />
            </div>
            <h3 className="text-base font-semibold text-ink-900 mb-1">No projects yet</h3>
            <p className="text-sm text-ink-400">Your team will add you to projects shortly.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const projectTasks = tasks.filter((t) => t.project?.id === project.id);
            const doneCount = projectTasks.filter((t) => t.status === 'done').length;
            const progress = projectTasks.length === 0 ? 0 : Math.round((doneCount / projectTasks.length) * 100);
            const meta = STATUS_META[project.status ?? ''] ?? STATUS_META.planning;
            const dates = project.dueDate ? `Due ${format(new Date(project.dueDate), 'MMM d, yyyy')}` : 'No due date';

            return (
              <Link key={project.id} to={`/portal/projects/${project.id}`}>
                <Card className="h-full transition-all duration-hover ease-brand hover:shadow-md hover:border-brass-500/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="h-10 w-10 rounded-md bg-pine-100 flex items-center justify-center flex-shrink-0">
                        <Briefcase size={18} className="text-pine-700" />
                      </div>
                      <Badge variant={meta.variant} dot>
                        {meta.label}
                      </Badge>
                    </div>
                    <h3 className="text-base font-semibold text-ink-900 mb-1 truncate">{project.name}</h3>
                    <p className="text-sm text-ink-500 line-clamp-2 mb-4 min-h-[2.5rem]">
                      {project.description || 'No description provided.'}
                    </p>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-ink-400">{doneCount} of {projectTasks.length} tasks done</span>
                          <span className="font-medium text-ink-600">{progress}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-ink-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brass-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-ink-400">{dates}</span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-pine-700">
                          View project
                          <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
