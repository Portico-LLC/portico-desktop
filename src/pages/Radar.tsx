import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, HelpCircle, ChevronDown, Gauge } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { motionTransition, springs } from '@/lib/motion/springs';
import { useSceneVisibility } from '@/lib/motion/useSceneVisibility';
import type { RadarSummary, RadarProjectRow, RadarTeamRow } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { CapacityBar } from '@/components/radar/CapacityBar';
import { RiskGauge } from '@/components/radar/RiskGauge';
import { RiskBreakdown } from '@/components/radar/RiskBreakdown';
import { BurnBars } from '@/components/radar/BurnBars';
import { InsufficientData } from '@/components/radar/InsufficientData';
import { MethodologyDialog } from '@/components/radar/MethodologyDialog';

const BAND_BADGE: Record<string, BadgeProps['variant']> = {
  low: 'moss',
  moderate: 'ochre',
  elevated: 'terracotta',
  critical: 'terracotta',
};

const BAND_LABEL: Record<string, string> = {
  low: 'Low',
  moderate: 'Moderate',
  elevated: 'Elevated',
  critical: 'Critical',
};

function shiftIsoDate(dateIso: string, days: number): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

function formatRange(startIso: string, endIso: string): string {
  return `${format(parseISO(startIso), 'MMM d')} – ${format(parseISO(endIso), 'MMM d, yyyy')}`;
}

function TeamRow({ row, reduce }: { row: RadarTeamRow; reduce: boolean }) {
  const u = row.utilization;
  return (
    <div className="flex items-center gap-4 rounded-md px-2 py-3 transition-colors duration-hover ease-brand hover:bg-ink-50">
      <Avatar name={row.name} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-ink-900">{row.name}</p>
          {u.utilizationPct != null ? (
            <span className="flex-shrink-0 text-sm tabular-nums text-ink-600">
              {u.committedHours}h <span className="text-ink-400">/ {u.capacityHours}h</span>{' '}
              <span className={cn('font-medium', u.utilizationPct > 100 ? 'text-terracotta-600' : 'text-ink-700')}>
                {u.utilizationPct}%
              </span>
            </span>
          ) : (
            <InsufficientData reason={u.unavailableReason} />
          )}
        </div>
        {u.utilizationPct != null && <div className="mt-2"><CapacityBar pct={u.utilizationPct} reduce={reduce} /></div>}
        {(u.isLowerBound || u.undatedOpenTaskCount > 0) && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {u.isLowerBound && (
              <span className="rounded-full bg-ochre-100 px-2 py-0.5 text-[11px] text-ochre-700">
                Based on {u.estimatedTaskCount} of {u.windowTaskCount} tasks — actual load is likely higher
              </span>
            )}
            {u.undatedOpenTaskCount > 0 && (
              <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] text-ink-500">
                +{u.undatedOpenTaskCount} open task{u.undatedOpenTaskCount === 1 ? '' : 's'} with no due date (not counted)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectRow({ row, reduce, play }: { row: RadarProjectRow; reduce: boolean; play: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { risk, burn } = row;
  const notScored = risk.status === 'not_scored';

  return (
    <div className={cn('rounded-md transition-colors duration-hover ease-brand', !notScored && 'hover:bg-ink-50')}>
      <button
        type="button"
        onClick={() => !notScored && setExpanded((v) => !v)}
        disabled={notScored}
        className="flex w-full items-center gap-4 px-2 py-3 text-left disabled:cursor-default"
      >
        <RiskGauge score={risk.score} band={risk.band} reduce={reduce} play={play} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-ink-900">{row.name}</p>
            {risk.band && (
              <Badge variant={BAND_BADGE[risk.band]} dot={risk.band === 'critical'}>
                {BAND_LABEL[risk.band]}
              </Badge>
            )}
          </div>
          {notScored ? (
            <InsufficientData reason={risk.unavailableReason} />
          ) : risk.status === 'insufficient_data' ? (
            <InsufficientData reason="insufficient_data" />
          ) : (
            <p className="mt-0.5 text-xs text-ink-500">
              {risk.coverage < 1
                ? `Computed from ${risk.components.filter((c) => c.available).length} of ${risk.components.length} signals`
                : 'All signals available'}
            </p>
          )}
        </div>
        {!notScored && (
          <ChevronDown
            size={16}
            className={cn('flex-shrink-0 text-ink-400 transition-transform duration-hover ease-brand', expanded && 'rotate-180')}
          />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && !notScored && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={motionTransition(reduce, springs.reposition)}
            className="overflow-hidden"
          >
            <div className="space-y-4 px-2 pb-4 pt-1">
              <RiskBreakdown components={risk.components} coverage={risk.coverage} />
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-400">Budget &amp; burn</p>
                <BurnBars scheduleElapsedPct={burn.scheduleElapsedPct} effortBurnPct={burn.effortBurnPct} reduce={reduce} />
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-ink-500">Planned cost to date</span>
                  {burn.budgetTracked && burn.plannedCostToDate != null ? (
                    <span className="tabular-nums text-ink-700">
                      ${burn.plannedCostToDate.toLocaleString()} ({burn.budgetBurnPct}% of budget)
                    </span>
                  ) : (
                    <InsufficientData reason={burn.unavailableBudgetReasons[0]} />
                  )}
                </div>
                {burn.manualProgressPct != null && (
                  <p className="mt-1 text-[11px] text-ink-400">
                    Manually marked {burn.manualProgressPct}% complete — {burn.effortBurnPct ?? '—'}% by computed effort.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Radar() {
  const reduce = !!useReducedMotion();
  const { ref, play } = useSceneVisibility<HTMLDivElement>();
  const [weekStart, setWeekStart] = useState<string | undefined>(undefined);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['radar', 'summary', weekStart],
    queryFn: () =>
      api.get<RadarSummary>('/radar/summary', { params: weekStart ? { weekStart } : {} }).then((res) => res.data),
    staleTime: 30_000,
  });

  const goToWeek = (deltaDays: number) => {
    const base = data?.weekStart ?? new Date().toISOString().slice(0, 10);
    setWeekStart(shiftIsoDate(base, deltaDays));
  };

  if (isLoading || !data) {
    return (
      <div className="p-8">
        <Skeleton className="h-9 w-72" />
        <div className="mt-8 space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium text-ink-900">Capacity &amp; Risk Radar</h1>
          <p className="mt-1 text-sm text-ink-500">Who's overloaded, and which projects are at risk — computed live, never guessed.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-ink-200 bg-bone-50 px-1 py-1">
            <button
              type="button"
              onClick={() => goToWeek(-7)}
              className="focus-ring flex h-7 w-7 items-center justify-center rounded-sm text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
              aria-label="Previous week"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-xs font-medium tabular-nums text-ink-700">{formatRange(data.weekStart, data.weekEnd)}</span>
            <button
              type="button"
              onClick={() => goToWeek(7)}
              className="focus-ring flex h-7 w-7 items-center justify-center rounded-sm text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
              aria-label="Next week"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setMethodologyOpen(true)}>
            <HelpCircle size={14} />
            How this is calculated
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Team capacity</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {data.team.length === 0 ? (
              <div className="p-6 text-center text-sm text-ink-400">No team members yet.</div>
            ) : (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div key={data.weekStart} className="divide-y divide-ink-100">
                  {data.team.map((row) => (
                    <motion.div key={row.personId} layout transition={motionTransition(reduce, springs.reposition)}>
                      <TeamRow row={row} reduce={reduce} />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project risk</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {data.projects.length === 0 ? (
              <div className="p-6 text-center text-sm text-ink-400 flex flex-col items-center gap-2">
                <Gauge className="text-ink-300" size={28} />
                No projects to score yet.
              </div>
            ) : (
              <div className="divide-y divide-ink-100">
                {data.projects.map((row) => (
                  <ProjectRow key={row.id} row={row} reduce={reduce} play={play} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <MethodologyDialog open={methodologyOpen} onOpenChange={setMethodologyOpen} />
    </div>
  );
}
