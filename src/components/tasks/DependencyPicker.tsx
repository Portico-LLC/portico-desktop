import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Task, TaskDependency } from '@/lib/types';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Ban, X } from 'lucide-react';

interface DependencyPickerProps {
  task: Task;
  /** Same-project tasks to offer as blockers — the server rejects self-references and
   *  cycles regardless, this just keeps the dropdown from listing obviously-invalid picks. */
  candidateTasks: Task[];
}

export function DependencyPicker({ task, candidateTasks }: DependencyPickerProps) {
  const queryClient = useQueryClient();

  const { data: dependencies = [] } = useQuery({
    queryKey: ['task-dependencies', task.id],
    queryFn: () => api.get<TaskDependency[]>(`/tasks/${task.id}/dependencies`).then((res) => res.data),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['task-dependencies', task.id] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const addMutation = useMutation({
    mutationFn: (blockedByTaskId: string) => api.post(`/tasks/${task.id}/dependencies`, { blockedByTaskId }),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (dependencyId: string) => api.delete(`/tasks/${task.id}/dependencies/${dependencyId}`),
    onSuccess: invalidate,
  });

  const blockedIds = new Set(dependencies.map((d) => d.blockedByTaskId));
  const options = candidateTasks.filter((t) => t.id !== task.id && !blockedIds.has(t.id));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Ban size={16} className="text-ink-400" />
        <h4 className="text-sm font-semibold text-ink-900">Blocked by</h4>
      </div>

      {dependencies.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {dependencies.map((dep) => (
            <Badge
              key={dep.id}
              variant={dep.blockedByTask?.status === 'done' ? 'neutral' : 'terracotta'}
              className="gap-1 pr-1"
            >
              {dep.blockedByTask?.title ?? 'Unknown task'}
              <button
                type="button"
                onClick={() => removeMutation.mutate(dep.id)}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-ink-900/10"
                title="Remove dependency"
              >
                <X size={11} />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {options.length > 0 && (
        // Remounted after every add/remove (key = current dependency count) so the picker
        // resets to its placeholder instead of keeping the just-picked task selected.
        <Select
          key={dependencies.length}
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) addMutation.mutate(e.target.value);
          }}
        >
          <option value="" disabled>
            Add a blocking task…
          </option>
          {options.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}
