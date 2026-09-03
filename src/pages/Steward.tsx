import { useEffect, useState } from 'react';
import { useStewardStore } from '@/store/steward';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ChevronDown, ChevronRight, Check, X, Pencil } from 'lucide-react';
import type { StewardProposal, StewardProposalSeverity, StewardProposedStep } from '@/lib/types';
import { STEWARD_TRIGGER_LABELS } from '@/lib/stewardLabels';
import { StewardRationale } from '@/components/steward/StewardRationale';
import { StewardEditProposalDialog } from '@/components/steward/StewardEditProposalDialog';

const SEVERITY_META: Record<StewardProposalSeverity, { label: string; variant: 'terracotta' | 'ochre' | 'steel' }> = {
  critical: { label: 'Critical', variant: 'terracotta' },
  warning: { label: 'Warning', variant: 'ochre' },
  info: { label: 'Info', variant: 'steel' },
};

function ProposalCard({ proposal }: { proposal: StewardProposal }) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const { approve, dismiss } = useStewardStore();
  const meta = SEVERITY_META[proposal.severity];
  const isPending = proposal.status === 'pending';

  const handleApprove = async () => {
    setBusy(true);
    await approve(proposal.id);
    setBusy(false);
  };

  const handleDismiss = async () => {
    setBusy(true);
    await dismiss(proposal.id);
    setBusy(false);
  };

  const handleEditSubmit = async (editedSteps: StewardProposedStep[]) => {
    setBusy(true);
    const ok = await approve(proposal.id, editedSteps);
    setBusy(false);
    if (ok) setEditing(false);
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              {STEWARD_TRIGGER_LABELS[proposal.triggerType] ?? proposal.triggerType}
            </span>
            <Badge variant={meta.variant}>{meta.label}</Badge>
            {proposal.status !== 'pending' && (
              <Badge variant={proposal.status === 'failed' ? 'terracotta' : 'neutral'}>{proposal.status}</Badge>
            )}
            {proposal.wasEdited && <Badge variant="outline">edited</Badge>}
          </div>
          <h3 className="text-[15px] font-semibold text-ink-900">{proposal.title}</h3>
          <StewardRationale segments={proposal.rationale} />
          {proposal.status === 'failed' && proposal.executionError && (
            <p className="mt-2 text-xs text-terracotta-600">Couldn't complete: {proposal.executionError}</p>
          )}
        </div>

        {isPending && (
          <div className="flex flex-shrink-0 items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleDismiss} disabled={busy}>
              <X size={14} />
              Dismiss
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)} disabled={busy}>
              <Pencil size={14} />
              Edit
            </Button>
            <Button size="sm" onClick={handleApprove} disabled={busy}>
              <Check size={14} />
              Approve
            </Button>
          </div>
        )}
      </div>

      {editing && (
        <StewardEditProposalDialog
          proposal={proposal}
          open={editing}
          onOpenChange={setEditing}
          onSubmit={handleEditSubmit}
          submitting={busy}
        />
      )}

      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="mt-3 flex items-center gap-1 text-xs text-ink-400 hover:text-ink-700"
      >
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        Reasoning trace ({proposal.trace.length} step{proposal.trace.length === 1 ? '' : 's'})
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {proposal.trace.map((step, i) => (
            <pre key={i} className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-sm bg-ink-950 p-2 text-[10.5px] text-bone-100">
              {step.tool}({JSON.stringify(step.args)})
              {'\n->\n'}
              {JSON.stringify(step.result, null, 2)}
            </pre>
          ))}
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-sm bg-ink-950 p-2 text-[10.5px] text-bone-100">
            proposed: {JSON.stringify(proposal.proposedSteps, null, 2)}
          </pre>
        </div>
      )}
    </Card>
  );
}

export function Steward() {
  const { proposals, isLoading, error, fetchProposals } = useStewardStore();

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-medium text-ink-900">Steward</h1>
        <p className="mt-1 text-sm text-ink-500">
          Grounded proposals from Portico's own reasoning agent — every claim traces to real data. Nothing here executes until you approve it.
        </p>
      </div>

      {error && <p className="mb-4 text-sm text-terracotta-600">{error}</p>}

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : proposals.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-display text-lg text-ink-700">Nothing needs your attention right now.</p>
          <p className="mt-1 text-sm text-ink-500">Steward watches Radar's risk signals and the studio's daily activity, and will surface a proposal here the moment something is genuinely worth a look.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Steward;
