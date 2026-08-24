import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { X, ChevronRight, ChevronDown, RefreshCw } from 'lucide-react';
import type { WorkflowRun, WorkflowRunWithNodes, WorkflowRunStatus, NodeRunStatus } from '@/lib/types';

const RUN_STATUS_META: Record<WorkflowRunStatus, { label: string; variant: 'neutral' | 'pine' | 'moss' | 'ochre' | 'terracotta' | 'steel' }> = {
  pending: { label: 'Pending', variant: 'neutral' },
  running: { label: 'Running', variant: 'ochre' },
  waiting: { label: 'Waiting', variant: 'steel' },
  success: { label: 'Success', variant: 'moss' },
  failed: { label: 'Failed', variant: 'terracotta' },
  cancelled: { label: 'Cancelled', variant: 'neutral' },
};

const NODE_STATUS_META: Record<NodeRunStatus, { label: string; variant: 'neutral' | 'pine' | 'moss' | 'ochre' | 'terracotta' | 'steel' }> = {
  pending: { label: 'Pending', variant: 'neutral' },
  running: { label: 'Running', variant: 'ochre' },
  success: { label: 'Success', variant: 'moss' },
  failed: { label: 'Failed', variant: 'terracotta' },
  skipped: { label: 'Skipped', variant: 'steel' },
};

const ACTIVE_STATUSES: WorkflowRunStatus[] = ['pending', 'running', 'waiting'];

export function RunHistoryPanel({ workflowId, onClose }: { workflowId: string; onClose: () => void }) {
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  const { data: runs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['automation-runs', workflowId],
    queryFn: () => api.get<WorkflowRun[]>(`/automations/${workflowId}/runs`).then((r) => r.data),
    refetchInterval: (query) => (query.state.data?.some((r) => ACTIVE_STATUSES.includes(r.status)) ? 2000 : false),
  });

  return (
    <div className="flex h-full w-96 flex-shrink-0 flex-col overflow-hidden border-l border-ink-200 bg-bone-50">
      <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
        <p className="text-sm font-medium text-ink-900">Run history</p>
        <div className="flex items-center gap-1">
          <button onClick={() => refetch()} className="rounded-sm p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-900" title="Refresh">
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
          <button onClick={onClose} className="rounded-sm p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-900">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="p-4 text-sm text-ink-400">Loading…</p>
        ) : runs.length === 0 ? (
          <p className="p-4 text-sm text-ink-400">No runs yet. Use "Run now" to test this workflow.</p>
        ) : (
          <div className="divide-y divide-ink-100">
            {runs.map((run) => (
              <RunRow key={run.id} run={run} expanded={expandedRunId === run.id} onToggle={() => setExpandedRunId((id) => (id === run.id ? null : run.id))} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RunRow({ run, expanded, onToggle }: { run: WorkflowRun; expanded: boolean; onToggle: () => void }) {
  const meta = RUN_STATUS_META[run.status];
  const { data: detail } = useQuery({
    queryKey: ['automation-run-detail', run.id],
    queryFn: () => api.get<WorkflowRunWithNodes>(`/automations/runs/${run.id}`).then((r) => r.data),
    enabled: expanded,
    refetchInterval: expanded && ACTIVE_STATUSES.includes(run.status) ? 2000 : false,
  });

  return (
    <div>
      <button onClick={onToggle} className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-ink-50">
        {expanded ? <ChevronDown size={14} className="flex-shrink-0 text-ink-400" /> : <ChevronRight size={14} className="flex-shrink-0 text-ink-400" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-ink-500">{formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}</p>
          <p className="truncate text-[11px] text-ink-400 capitalize">{String((run.triggerContext as { type?: string })?.type ?? '')} trigger</p>
        </div>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-ink-100 bg-ink-50/60 px-4 py-3">
          {run.error && <p className="text-xs text-terracotta-600">{run.error}</p>}
          {!detail ? (
            <p className="text-xs text-ink-400">Loading steps…</p>
          ) : detail.nodeRuns.length === 0 ? (
            <p className="text-xs text-ink-400">No steps executed yet.</p>
          ) : (
            detail.nodeRuns.map((nr) => (
              <div key={nr.id} className="rounded-sm border border-ink-200 bg-bone-50 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-ink-800">{nr.nodeType}</span>
                  <Badge variant={NODE_STATUS_META[nr.status].variant}>{NODE_STATUS_META[nr.status].label}</Badge>
                </div>
                {nr.error && <p className="mt-1 text-[11px] text-terracotta-600">{nr.error}</p>}
                {nr.output != null && (
                  <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-sm bg-ink-950 p-1.5 text-[10px] text-bone-100">
                    {JSON.stringify(nr.output, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
