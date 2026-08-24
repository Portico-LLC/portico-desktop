import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Project } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { PanelListRow, PanelEmptyState, PanelSkeletonList } from '@/components/panel/PanelListPrimitives';
import { FolderKanban } from 'lucide-react';

export function ProjectsTab() {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects').then((res) => res.data),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return <PanelSkeletonList count={5} rowHeight="h-14" />;
  }

  if (projects.length === 0) {
    return <PanelEmptyState icon={<FolderKanban className="h-6 w-6 text-ink-300" />} message="No projects yet." />;
  }

  return (
    <div className="divide-y divide-ink-100">
      {projects.map((project, index) => (
        <PanelListRow key={project.id} index={index} interactive={false} className="block">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-ink-900">{project.name}</p>
            {project.status && (
              <Badge variant="outline" className="flex-shrink-0 capitalize">
                {project.status}
              </Badge>
            )}
          </div>
          {project.client && <p className="mt-0.5 truncate text-xs text-ink-500">{project.client.name}</p>}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-pine-700 transition-all duration-transition ease-brand"
              style={{ width: `${Math.max(0, Math.min(100, project.progress ?? 0))}%` }}
            />
          </div>
        </PanelListRow>
      ))}
    </div>
  );
}
