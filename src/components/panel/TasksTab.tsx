import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { Task } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { PanelListRow, PanelEmptyState, PanelSkeletonList } from '@/components/panel/PanelListPrimitives';
import { ListChecks } from 'lucide-react';
import { format, isPast, isToday, parseISO } from 'date-fns';

const PANEL_TASK_LIMIT = 20;

function dueBadge(dueDate?: string) {
  if (!dueDate) return null;
  const date = parseISO(dueDate);
  if (isPast(date) && !isToday(date)) {
    return <Badge variant="terracotta">Overdue</Badge>;
  }
  if (isToday(date)) {
    return <Badge variant="ochre">Today</Badge>;
  }
  return <Badge variant="outline">{format(date, 'MMM d')}</Badge>;
}

export function TasksTab() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get<Task[]>('/tasks').then((res) => res.data),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const toggleDone = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      api.patch(`/tasks/${id}`, { status: done ? 'done' : 'todo' }).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const mine = tasks
    .filter((t) => t.assigneeId === currentUser?.id && t.status !== 'done')
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime();
    });

  const visible = mine.slice(0, PANEL_TASK_LIMIT);
  const overflow = mine.length - visible.length;

  if (isLoading) {
    return <PanelSkeletonList count={5} />;
  }

  if (visible.length === 0) {
    return <PanelEmptyState icon={<ListChecks className="h-6 w-6 text-ink-300" />} message="Nothing assigned to you right now." />;
  }

  return (
    <div className="divide-y divide-ink-100">
      {visible.map((task, index) => (
        <PanelListRow as="label" key={task.id} index={index} className="select-none">
          <input
            type="checkbox"
            checked={false}
            onChange={(e) => toggleDone.mutate({ id: task.id, done: e.target.checked })}
            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-sm border-ink-300 bg-bone-50 accent-brass-600 focus:ring-2 focus:ring-brass-200"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-ink-900">{task.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {task.project && (
                <span className="truncate text-[11px] text-ink-400">{task.project.name}</span>
              )}
              {dueBadge(task.dueDate)}
            </div>
          </div>
        </PanelListRow>
      ))}
      {overflow > 0 && (
        <div className="px-3 py-2 text-center text-[11px] text-ink-400">+{overflow} more</div>
      )}
    </div>
  );
}
