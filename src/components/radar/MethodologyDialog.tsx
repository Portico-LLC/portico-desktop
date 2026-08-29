import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { RadarMethodology } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { Skeleton } from '@/components/ui/Skeleton';

/** Renders the server's own methodology response, not a hand-maintained copy — so this text
 *  can never drift out of sync with what radar-metrics.ts actually computes. */
export function MethodologyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['radar', 'methodology'],
    queryFn: () => api.get<RadarMethodology>('/radar/methodology').then((res) => res.data),
    enabled: open,
    staleTime: Infinity,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>How Radar is calculated</DialogTitle>
          <DialogDescription>
            Every figure here is arithmetic over real task, project, and employee data — never an AI estimate.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {data.components.map((c) => (
                <div key={c.key} className="rounded-md border border-ink-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-ink-900">{c.label}</p>
                    <span className="text-xs tabular-nums text-brass-700">{Math.round(data.weights[c.key] * 100)}% weight</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-500">{c.description}</p>
                </div>
              ))}
            </div>
            <ul className="space-y-1.5 border-t border-ink-200 pt-3 text-xs leading-relaxed text-ink-500">
              {data.notes.map((note, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden>·</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-ink-400">Formula version {data.formulaVersion}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
