import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { Gauge } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { motionTransition, springs } from '@/lib/motion/springs';
import type { RadarSummary, RadarProjectRow, RadarBand } from '@/lib/types';
import { CapacityBar } from '@/components/radar/CapacityBar';
import { reasonLabel } from '@/components/radar/reasonCopy';
import { PanelListRow, PanelEmptyState, PanelSkeletonList } from '@/components/panel/PanelListPrimitives';

type Scope = 'team' | 'risk';

const BAND_DOT: Record<RadarBand, string> = {
  low: 'bg-moss-500',
  moderate: 'bg-ochre-500',
  elevated: 'bg-terracotta-400',
  critical: 'bg-terracotta-600',
};

/** Team / Risk, as a two-pill segmented control — same pattern as TasksTab's scope switch,
 *  with its own `layoutId` so the two sliding pills don't cross-animate into each other if a
 *  viewer switches tabs mid-transition. */
function ScopeSwitch({ scope, onChange, reduce }: { scope: Scope; onChange: (next: Scope) => void; reduce: boolean }) {
  return (
    <div role="radiogroup" aria-label="Radar scope" className="flex items-center gap-0.5 rounded-full bg-ink-100 p-0.5">
      {(['team', 'risk'] as Scope[]).map((value) => {
        const active = scope === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(value)}
            className={cn(
              'focus-ring relative rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-colors duration-hover ease-brand',
              active ? 'text-bone-50' : 'text-ink-500 hover:text-ink-900',
            )}
          >
            {active && (
              <motion.span
                layoutId="panel-radar-scope"
                className="absolute inset-0 rounded-full bg-pine-900"
                transition={motionTransition(reduce, springs.snappy)}
              />
            )}
            <span className="relative z-10">{value}</span>
          </button>
        );
      })}
    </div>
  );
}

function summarizeRisk(row: RadarProjectRow): string {
  if (row.risk.status === 'not_scored') return 'Not scored — closed';
  if (row.risk.status === 'insufficient_data' || row.risk.score == null) return 'Not enough data';
  const overdue = row.risk.components.find((c) => c.key === 'scheduleSlip');
  const blocked = row.risk.components.find((c) => c.key === 'blockedWork');
  const parts: string[] = [];
  if (overdue?.available && Number(overdue.detail.overdueCount) > 0) parts.push(`${overdue.detail.overdueCount} overdue`);
  if (blocked?.available && Number(blocked.detail.blockedCount) > 0) parts.push(`${blocked.detail.blockedCount} blocked`);
  return parts.length ? parts.join(' · ') : 'On track';
}

export function RadarTab() {
  const reduce = !!useReducedMotion();
  const [scope, setScope] = useState<Scope>('team');

  const { data, isLoading } = useQuery({
    queryKey: ['radar', 'summary', 'panel'],
    queryFn: () => api.get<RadarSummary>('/radar/summary').then((res) => res.data),
    staleTime: 30_000,
  });

  if (isLoading || !data) {
    return <PanelSkeletonList count={5} rowHeight="h-12" />;
  }

  const isEmpty = scope === 'team' ? data.team.length === 0 : data.projects.length === 0;
  if (isEmpty) {
    return (
      <PanelEmptyState
        icon={<Gauge className="text-ink-300" size={28} />}
        message="No capacity data yet — add estimated hours to tasks."
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex justify-center px-3 pb-1 pt-3">
        <ScopeSwitch scope={scope} onChange={setScope} reduce={reduce} />
      </div>
      <div className="flex-1 overflow-y-auto">
        {scope === 'team'
          ? data.team.map((row, i) => (
              <PanelListRow key={row.personId} index={i} interactive={false} className="flex-col items-stretch gap-1.5">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-medium text-ink-900">{row.name}</p>
                  {row.utilization.utilizationPct != null ? (
                    <span
                      className={cn(
                        'text-xs font-medium tabular-nums',
                        row.utilization.utilizationPct > 100 ? 'text-terracotta-600' : 'text-ink-600',
                      )}
                    >
                      {row.utilization.utilizationPct}%
                    </span>
                  ) : (
                    <span className="text-xs italic text-ink-400" title={reasonLabel(row.utilization.unavailableReason)}>
                      —
                    </span>
                  )}
                </div>
                {row.utilization.utilizationPct != null && <CapacityBar pct={row.utilization.utilizationPct} reduce={reduce} />}
              </PanelListRow>
            ))
          : data.projects.map((row, i) => (
              <PanelListRow key={row.id} index={i} interactive={false} className="items-center">
                <span
                  className={cn('mt-1 h-2 w-2 flex-shrink-0 rounded-full', row.risk.band ? BAND_DOT[row.risk.band] : 'bg-ink-200')}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-ink-900">{row.name}</p>
                    <span className="flex-shrink-0 text-xs font-medium tabular-nums text-ink-600">{row.risk.score ?? '—'}</span>
                  </div>
                  <p className="truncate text-xs text-ink-400">{summarizeRisk(row)}</p>
                </div>
              </PanelListRow>
            ))}
      </div>
    </div>
  );
}
