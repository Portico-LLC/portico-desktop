import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, ListChecks } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';
import { ONBOARDING_QUERY_KEY, dismissChecklist, fetchBootstrap } from '@/lib/onboarding/api';

/** The discoverable half of replay — the profile menu carries the same action for people who
 *  already know it exists, and for clients, who have no Settings page. */
export function WalkthroughCard() {
  const role = useAuthStore((s) => s.role);
  const isOwner = role === 'user';
  const requestReplay = useOnboardingStore((s) => s.requestReplay);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ONBOARDING_QUERY_KEY,
    queryFn: () => fetchBootstrap(role),
    staleTime: 30_000,
  });

  const restore = useMutation({
    mutationFn: () => dismissChecklist(false),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY }),
    meta: { successMessage: 'Checklist restored', errorTitle: 'Could not restore the checklist' },
  });

  const checklistHidden = isOwner && data?.checklist.applicable && data.checklist.dismissed;

  return (
    <Card data-tour-id="settings.replayTour">
      <CardHeader>
        <CardTitle>Walkthrough</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-ink-500">
            Run the guided tour of Portico again, from the beginning.
          </p>
          <Button variant="secondary" size="sm" onClick={() => requestReplay()}>
            <RotateCcw size={14} />
            Replay
          </Button>
        </div>

        {checklistHidden && (
          <div className="flex items-center justify-between gap-4 border-t border-ink-200 pt-4">
            <p className="text-ink-500">Your setup checklist is hidden on the dashboard.</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => restore.mutate()}
              disabled={restore.isPending}
            >
              <ListChecks size={14} />
              {restore.isPending ? 'Restoring…' : 'Show it again'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
