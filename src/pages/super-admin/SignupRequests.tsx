import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Inbox } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export function SignupRequests() {
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['super-admin', 'companies', 'pending'],
    queryFn: () => api.get<User[]>('/super-admin/companies/pending').then((res) => res.data),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['super-admin', 'companies', 'pending'] });
    queryClient.invalidateQueries({ queryKey: ['super-admin', 'companies'] });
  };

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/super-admin/companies/${id}/approve`),
    onSuccess: invalidate,
    meta: { successMessage: 'Request approved', errorTitle: 'Could not approve request' },
  });

  const reject = useMutation({
    mutationFn: (id: string) => api.post(`/super-admin/companies/${id}/reject`),
    onSuccess: invalidate,
    meta: { successMessage: 'Request declined', errorTitle: 'Could not decline request' },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-72" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-medium text-bone-50">Signup requests</h1>
        <p className="mt-1 text-sm text-ink-400">
          {requests.length} pending request{requests.length !== 1 ? 's' : ''} awaiting review.
        </p>
      </div>

      {requests.length === 0 ? (
        <Card className="border-ink-800 bg-ink-900 p-12 text-center hover:shadow-none hover:translate-y-0">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-ink-700" />
          <p className="text-sm text-ink-500">No pending requests — you're all caught up.</p>
        </Card>
      ) : (
        <Card className="border-ink-800 bg-ink-900 hover:shadow-none hover:translate-y-0">
          <CardHeader className="border-ink-800">
            <CardTitle className="text-bone-50">Pending</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-ink-800">
              {requests.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-bone-50">
                      {r.company || `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim()}
                    </p>
                    <p className="truncate text-sm text-ink-500">
                      {r.email}
                      {r.createdAt && ` · requested ${formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}`}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="border-ink-700 bg-ink-800 text-bone-100 hover:bg-ink-700"
                      onClick={() => reject.mutate(r.id)}
                      disabled={approve.isPending || reject.isPending}
                    >
                      <X size={14} />
                      Decline
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-moss-600 hover:bg-moss-700"
                      onClick={() => approve.mutate(r.id)}
                      disabled={approve.isPending || reject.isPending}
                    >
                      <Check size={14} />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
