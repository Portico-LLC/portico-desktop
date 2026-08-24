import { useState } from 'react';
import type { Task } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ListTree, Plus } from 'lucide-react';

interface SubtaskListProps {
  subtasks: Task[];
  onAdd: (title: string) => void;
  onToggleDone: (subtask: Task) => void;
  canEdit?: boolean;
}

export function SubtaskList({ subtasks, onAdd, onToggleDone, canEdit = true }: SubtaskListProps) {
  const [draft, setDraft] = useState('');
  const doneCount = subtasks.filter((s) => s.status === 'done').length;

  const submit = () => {
    const title = draft.trim();
    if (!title) return;
    onAdd(title);
    setDraft('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ListTree size={16} className="text-ink-400" />
        <h4 className="text-sm font-semibold text-ink-900">Subtasks</h4>
        {subtasks.length > 0 && (
          <Badge variant="neutral" className="h-5 px-2">
            {doneCount}/{subtasks.length}
          </Badge>
        )}
      </div>

      {subtasks.length > 0 && (
        <div className="space-y-1.5">
          {subtasks.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer select-none items-center gap-2.5 rounded-sm px-1 py-1 text-sm hover:bg-ink-50"
            >
              <input
                type="checkbox"
                checked={s.status === 'done'}
                onChange={() => onToggleDone(s)}
                disabled={!canEdit}
                className="h-4 w-4 flex-shrink-0 rounded-sm border-ink-300 bg-bone-50 accent-brass-600 focus:ring-2 focus:ring-brass-200"
              />
              <span className={s.status === 'done' ? 'text-ink-400 line-through' : 'text-ink-700'}>{s.title}</span>
            </label>
          ))}
        </div>
      )}

      {canEdit && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Add a subtask..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button variant="secondary" size="icon" onClick={submit} disabled={!draft.trim()}>
            <Plus size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}
