import { cn } from '@/lib/utils';
import type { RadarRiskComponent } from '@/lib/types';
import { reasonLabel } from './reasonCopy';

const LABELS: Record<RadarRiskComponent['key'], string> = {
  scheduleSlip: 'Schedule slip',
  progressVsElapsed: 'Progress vs. elapsed schedule',
  blockedWork: 'Blocked work',
  capacityStrain: 'Team capacity strain',
};

/** Turns the raw counts `radar-metrics.ts` returns into the exact plain-English sentence they
 *  support — no phrasing here is generated or summarized by an LLM, it's a fixed template per
 *  component filled in with the literal numbers the formula produced. */
function describe(c: RadarRiskComponent): string {
  const d = c.detail;
  switch (c.key) {
    case 'scheduleSlip':
      return `${d.overdueCount} of ${d.datedOpenCount} dated open tasks are overdue`;
    case 'progressVsElapsed':
      return `${d.workDonePct}% of work done (by ${d.basis === 'hours' ? 'estimated hours' : 'task count'}) vs. ${d.scheduleElapsedPct}% of the schedule elapsed`;
    case 'blockedWork':
      return `${d.blockedCount} of ${d.openCount} open tasks are blocked by an incomplete dependency`;
    case 'capacityStrain':
      return `${d.knownCount} of ${d.memberCount} assigned team members have a computable utilization`;
    default:
      return '';
  }
}

export function RiskBreakdown({ components, coverage }: { components: RadarRiskComponent[]; coverage: number }) {
  const availableCount = components.filter((c) => c.available).length;

  return (
    <div className="space-y-1 rounded-md border border-ink-200 bg-bone-50 p-3">
      {components.map((c) => (
        <div
          key={c.key}
          className={cn('flex items-start justify-between gap-3 rounded-sm px-2 py-1.5', !c.available && 'opacity-50')}
        >
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-900">{LABELS[c.key]}</p>
            <p className="text-xs text-ink-500">{c.available ? describe(c) : reasonLabel(c.unavailableReason)}</p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-3 text-xs tabular-nums text-ink-600">
            <span>{c.available ? c.score : '—'}</span>
            <span className="text-ink-400">× {Math.round(c.weight * 100)}%</span>
          </div>
        </div>
      ))}
      {coverage < 1 && (
        <p className="border-t border-ink-200 pt-2 text-[11px] text-ink-400">
          Computed from {availableCount} of {components.length} signals — weights renormalized.
        </p>
      )}
    </div>
  );
}
