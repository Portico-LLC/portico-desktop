import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Play, Power, History, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAutomationsStore } from '@/store/automations';

export function AutomationToolbar({
  historyOpen,
  onToggleHistory,
  onRan,
}: {
  historyOpen: boolean;
  onToggleHistory: () => void;
  onRan: () => void;
}) {
  const navigate = useNavigate();
  const workflow = useAutomationsStore((s) => s.workflow);
  const isDirty = useAutomationsStore((s) => s.isDirty);
  const isSaving = useAutomationsStore((s) => s.isSaving);
  const error = useAutomationsStore((s) => s.error);
  const setMeta = useAutomationsStore((s) => s.setMeta);
  const save = useAutomationsStore((s) => s.save);
  const setActive = useAutomationsStore((s) => s.setActive);
  const runNow = useAutomationsStore((s) => s.runNow);
  const clearError = useAutomationsStore((s) => s.clearError);

  if (!workflow) return null;

  const handleRunNow = async () => {
    const ok = await runNow();
    if (ok) onRan();
  };

  return (
    <div className="border-b border-ink-200 bg-bone-50">
      <div className="flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/automations')} title="Back to automations">
          <ArrowLeft size={16} />
        </Button>

        <Input
          value={workflow.name}
          onChange={(e) => setMeta({ name: e.target.value })}
          className="h-8 w-64 border-transparent bg-transparent px-1 text-base font-medium hover:border-ink-200 focus:border-brass-500"
        />

        <Badge variant={workflow.isActive ? 'moss' : 'neutral'}>{workflow.isActive ? 'Active' : 'Inactive'}</Badge>
        {isDirty && (
          <Badge variant="outline" className="text-ink-500">
            Unsaved changes
          </Badge>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onToggleHistory}>
            <History size={14} />
            {historyOpen ? 'Hide history' : 'Run history'}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleRunNow} disabled={isSaving}>
            <Play size={14} />
            Run now
          </Button>
          <Button variant="secondary" size="sm" onClick={() => save()} disabled={!isDirty || isSaving}>
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </Button>
          <Button
            variant={workflow.isActive ? 'destructive' : 'primary'}
            size="sm"
            onClick={() => setActive(!workflow.isActive)}
            disabled={isSaving}
          >
            <Power size={14} />
            {workflow.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-3 border-t border-terracotta-200 bg-terracotta-500/5 px-4 py-2">
          <p className="text-xs text-terracotta-700">{error}</p>
          <button onClick={clearError} className="flex-shrink-0 text-terracotta-500 hover:text-terracotta-700">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
