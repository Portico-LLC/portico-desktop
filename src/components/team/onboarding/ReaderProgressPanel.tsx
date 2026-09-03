import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetchFlowReaders, resetFlowReader, type FlowAudience } from '@/lib/onboarding/api';
import type { OnboardingStatus } from '@/lib/onboarding/types';

const STATUS_META: Record<OnboardingStatus, { label: string; variant: 'moss' | 'brass' | 'neutral' }> = {
  completed: { label: 'Done', variant: 'moss' },
  in_progress: { label: 'In progress', variant: 'brass' },
  skipped: { label: 'Skipped', variant: 'neutral' },
  not_started: { label: 'Not started', variant: 'neutral' },
};

/** Without this the owner is authoring blind — they have no way to know whether anyone opened
 *  what they wrote, or to send one person back through it after a rewrite. */
export function ReaderProgressPanel({ audience }: { audience: FlowAudience }) {
  const queryClient = useQueryClient();
  const queryKey = ['onboarding', 'flow-readers', audience];

  const { data: readers = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchFlowReaders(audience),
  });

  const reset = useMutation({
    mutationFn: (subjectId: string) => resetFlowReader(audience, subjectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    meta: { successMessage: 'They will see it again next time they sign in', errorTitle: 'Could not reset' },
  });

  const noun = audience === 'employee' ? 'team members' : 'clients';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Who has seen it</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : readers.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-ink-400">
            No {noun} have reached this yet.
          </p>
        ) : (
          <ul className="divide-y divide-ink-200">
            {readers.map((reader) => (
              <li
                key={reader.subjectId}
                className="group flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-hover ease-brand hover:bg-ink-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={reader.name} src={reader.avatarUrl} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">{reader.name}</p>
                    {reader.email && (
                      <p className="truncate text-xs text-ink-400">{reader.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_META[reader.status].variant} dot>
                    {STATUS_META[reader.status].label}
                  </Badge>
                  {reader.status !== 'not_started' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      disabled={reset.isPending}
                      onClick={() => reset.mutate(reader.subjectId)}
                      title="Send them through it again"
                    >
                      <RotateCcw size={13} />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
