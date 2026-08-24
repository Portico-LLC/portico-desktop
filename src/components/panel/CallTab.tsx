import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, PhoneCall } from 'lucide-react';
import { api } from '@/lib/api';
import type { Project } from '@/lib/types';
import { PanelListRow, PanelEmptyState, PanelSkeletonList } from '@/components/panel/PanelListPrimitives';
import { CallPanel } from '@/components/calls/CallPanel';

export function CallTab() {
  const [selected, setSelected] = useState<Project | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects').then((res) => res.data),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  if (selected) {
    return (
      <div className="flex h-full flex-col">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="flex flex-shrink-0 items-center gap-1 px-4 pt-3 text-xs font-medium text-ink-500 transition-colors duration-hover ease-brand hover:text-ink-800"
        >
          <ChevronLeft size={13} />
          Projects
        </button>
        <CallPanel
          projectId={selected.id}
          clientId={selected.clientId}
          projectName={selected.name}
          className="flex-1"
        />
      </div>
    );
  }

  if (isLoading) {
    return <PanelSkeletonList count={5} rowHeight="h-14" />;
  }

  if (projects.length === 0) {
    return (
      <PanelEmptyState
        icon={<PhoneCall className="h-6 w-6 text-ink-300" />}
        message="No projects yet — create one to start a call."
      />
    );
  }

  return (
    <div className="divide-y divide-ink-100">
      {projects.map((project, index) => (
        <PanelListRow key={project.id} index={index} onClick={() => setSelected(project)} className="block">
          <p className="truncate text-sm font-medium text-ink-900">{project.name}</p>
          {project.client && <p className="mt-0.5 truncate text-xs text-ink-500">{project.client.name}</p>}
        </PanelListRow>
      ))}
    </div>
  );
}
