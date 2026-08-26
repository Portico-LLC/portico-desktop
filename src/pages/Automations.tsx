import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { api, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Workflow, WorkflowRun, WorkflowRunStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Plus, Workflow as WorkflowIcon, Trash2, Zap, Clock, Play, AlertTriangle, Loader2, CheckCircle2, XCircle } from 'lucide-react';

const TRIGGER_META: Record<string, { label: string; icon: typeof Zap }> = {
  'trigger.manual': { label: 'Manual', icon: Play },
  'trigger.cron': { label: 'Scheduled', icon: Clock },
  'trigger.event': { label: 'Event', icon: Zap },
};

const ACTIVE_RUN_STATUSES: WorkflowRunStatus[] = ['pending', 'running', 'waiting'];

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-hover ease-brand disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-pine-800' : 'bg-ink-200',
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 transform rounded-full bg-bone-50 shadow-sm transition-transform duration-hover ease-brand',
          checked ? 'translate-x-[18px]' : 'translate-x-1',
        )}
      />
    </button>
  );
}

function RunResultBadge({ run }: { run: WorkflowRun }) {
  if (ACTIVE_RUN_STATUSES.includes(run.status)) {
    return (
      <Badge variant="ochre">
        <Loader2 size={11} className="animate-spin" />
        Running
      </Badge>
    );
  }
  if (run.status === 'success') {
    return (
      <Badge variant="moss">
        <CheckCircle2 size={11} />
        Success
      </Badge>
    );
  }
  if (run.status === 'failed') {
    return (
      <Badge variant="terracotta" title={run.error ?? undefined}>
        <XCircle size={11} />
        Failed
      </Badge>
    );
  }
  return <Badge variant="neutral">{run.status}</Badge>;
}

function AutomationRow({ workflow, onDeleteRequest }: { workflow: Workflow; onDeleteRequest: (workflow: Workflow) => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const activateMutation = useMutation({
    mutationFn: (isActive: boolean) => api.patch<Workflow>(`/automations/${workflow.id}/active`, { isActive }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automations'] }),
    meta: { suppressErrorToast: true },
  });

  const runMutation = useMutation({
    mutationFn: () => api.post<WorkflowRun>(`/automations/${workflow.id}/run`).then((r) => r.data),
    onSuccess: (run) => setActiveRunId(run.id),
    meta: { successMessage: 'Automation started', errorTitle: 'Could not run automation' },
  });

  const { data: activeRun } = useQuery({
    queryKey: ['automation-row-run', activeRunId],
    queryFn: () => api.get<WorkflowRun>(`/automations/runs/${activeRunId}`).then((r) => r.data),
    enabled: !!activeRunId,
    refetchInterval: (query) => (query.state.data && ACTIVE_RUN_STATUSES.includes(query.state.data.status) ? 1500 : false),
  });

  const trigger = TRIGGER_META[workflow.trigger.type] ?? TRIGGER_META['trigger.manual'];
  const TriggerIcon = trigger.icon;
  const isRunning = !!activeRun && ACTIVE_RUN_STATUSES.includes(activeRun.status);

  return (
    <div
      className="flex cursor-pointer items-center justify-between gap-4 p-4 transition-colors hover:bg-ink-50"
      onClick={() => navigate(`/automations/${workflow.id}`)}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-pine-800 text-bone-50">
          <WorkflowIcon size={18} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-900">{workflow.name}</p>
          <p className="truncate text-sm text-ink-400">
            {workflow.nodes.length} step{workflow.nodes.length !== 1 ? 's' : ''} · Updated{' '}
            {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}
          </p>
          {activateMutation.isError && <p className="mt-0.5 text-xs text-terracotta-600">{getErrorMessage(activateMutation.error)}</p>}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <Badge variant="outline">
          <TriggerIcon size={11} />
          {trigger.label}
        </Badge>

        {activeRun && <RunResultBadge run={activeRun} />}

        <Button
          variant="ghost"
          size="sm"
          title="Run now"
          disabled={isRunning || runMutation.isPending}
          onClick={() => runMutation.mutate()}
        >
          {isRunning || runMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
        </Button>

        <div className="flex items-center gap-2">
          <ToggleSwitch
            checked={workflow.isActive}
            disabled={activateMutation.isPending}
            onChange={() => activateMutation.mutate(!workflow.isActive)}
          />
          <span className="w-12 text-xs font-medium text-ink-500">{workflow.isActive ? 'Active' : 'Inactive'}</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-terracotta-600 hover:bg-terracotta-100"
          onClick={() => onDeleteRequest(workflow)}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}

export function Automations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null);

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: () => api.get<Workflow[]>('/automations').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post<Workflow>('/automations', { name, description: description || undefined }).then((r) => r.data),
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      setDialogOpen(false);
      setName('');
      setDescription('');
      navigate(`/automations/${workflow.id}`);
    },
    meta: { successMessage: 'Automation created', suppressErrorToast: true },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/automations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      setDeleteTarget(null);
    },
    meta: { successMessage: 'Automation deleted', suppressErrorToast: true },
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-semibold text-ink-900 mb-2">Automations</h1>
          <p className="text-ink-500">Build workflows that act on your workspace automatically — schedules, events, and actions.</p>
        </div>
        <Button variant="primary" onClick={() => setDialogOpen(true)}>
          <Plus size={18} />
          New Automation
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {workflows.length} automation{workflows.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {workflows.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pine-800 text-bone-50">
                <WorkflowIcon size={22} />
              </div>
              <h3 className="font-display text-lg font-medium text-ink-900 mb-1">No automations yet</h3>
              <p className="mx-auto max-w-sm text-sm text-ink-500">
                Create one to have Portico act on your behalf — send messages, create tasks or invoices, and more.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-ink-200">
              {workflows.map((workflow) => (
                <AutomationRow key={workflow.id} workflow={workflow} onDeleteRequest={setDeleteTarget} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Automation</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) createMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="automation-name">Name</Label>
              <Input id="automation-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Notify me on new client messages" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="automation-description">Description (optional)</Label>
              <Textarea id="automation-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            {createMutation.isError && <p className="text-xs text-terracotta-600">{getErrorMessage(createMutation.error)}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={!name.trim() || createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create & Build'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-terracotta-500/10 text-terracotta-600">
                <AlertTriangle size={18} />
              </div>
              <DialogTitle>Delete automation</DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-sm text-ink-500">
            Delete <span className="font-medium text-ink-900">"{deleteTarget?.name}"</span>? Its run history will be removed too. This
            cannot be undone.
          </p>
          {deleteMutation.isError && <p className="text-xs text-terracotta-600">{getErrorMessage(deleteMutation.error)}</p>}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
