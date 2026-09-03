import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { StewardProposal, StewardProposalSeverity } from '@/lib/types';
import { STEWARD_TRIGGER_LABELS } from '@/lib/stewardLabels';
import { PanelListRow, PanelEmptyState, PanelSkeletonList } from '@/components/panel/PanelListPrimitives';

const SEVERITY_DOT: Record<StewardProposalSeverity, string> = {
  critical: 'bg-terracotta-600',
  warning: 'bg-ochre-500',
  info: 'bg-steel-500',
};

function rationaleToText(rationale: StewardProposal['rationale']): string {
  return rationale.map((s) => (s.type === 'text' ? s.value : s.label)).join(' ');
}

/** Deliberately no Edit affordance and no citation links here — the Panel is too narrow for
 *  that detail; a proposal that needs editing gets opened in the full app via `/steward`. */
export function StewardTab() {
  const queryClient = useQueryClient();

  const { data: proposals, isLoading } = useQuery({
    queryKey: ['steward-proposals'],
    queryFn: () => api.get<StewardProposal[]>('/steward/proposals').then((r) => r.data.filter((p) => p.status === 'pending')),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['steward-proposals'] });
  const approve = useMutation({ mutationFn: (id: string) => api.post(`/steward/proposals/${id}/approve`, {}), onSuccess: invalidate });
  const dismiss = useMutation({ mutationFn: (id: string) => api.post(`/steward/proposals/${id}/dismiss`), onSuccess: invalidate });

  if (isLoading) return <PanelSkeletonList count={3} rowHeight="h-16" />;

  if (!proposals || proposals.length === 0) {
    return <PanelEmptyState icon={<Sparkles size={22} className="text-ink-300" />} message="Nothing needs your attention right now." />;
  }

  return (
    <div className="divide-y divide-ink-100">
      {proposals.map((proposal, i) => (
        <PanelListRow key={proposal.id} index={i} interactive={false} className="flex-col items-stretch gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', SEVERITY_DOT[proposal.severity])} />
            <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              {STEWARD_TRIGGER_LABELS[proposal.triggerType] ?? proposal.triggerType}
            </span>
          </div>
          <p className="text-[13px] font-medium leading-snug text-ink-900">{proposal.title}</p>
          <p className="line-clamp-2 text-[11px] leading-snug text-ink-500">{rationaleToText(proposal.rationale)}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => dismiss.mutate(proposal.id)}
              disabled={dismiss.isPending || approve.isPending}
              className="flex h-6 flex-1 items-center justify-center gap-1 rounded-sm border border-ink-200 text-[11px] text-ink-600 transition-colors duration-hover ease-brand hover:bg-ink-50 disabled:opacity-50"
            >
              <X size={11} />
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => approve.mutate(proposal.id)}
              disabled={dismiss.isPending || approve.isPending}
              className="flex h-6 flex-1 items-center justify-center gap-1 rounded-sm bg-pine-900 text-[11px] text-bone-50 transition-colors duration-hover ease-brand hover:bg-pine-950 disabled:opacity-50"
            >
              <Check size={11} />
              Approve
            </button>
          </div>
        </PanelListRow>
      ))}
    </div>
  );
}
