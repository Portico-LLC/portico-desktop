import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Mail, RotateCw, X } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import type { Invitation, InvitationType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

const STATUS_VARIANT: Record<Invitation['status'], 'brass' | 'moss' | 'terracotta' | 'neutral'> = {
  pending: 'brass',
  accepted: 'moss',
  expired: 'terracotta',
  revoked: 'neutral',
};

export function InvitesPanel({ type }: { type: InvitationType }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: invitations = [] } = useQuery({
    queryKey: ['invitations', type],
    queryFn: () => api.get<Invitation[]>('/invitations', { params: { type } }).then((res) => res.data),
  });

  const pending = invitations.filter((i) => i.status === 'pending' || i.status === 'expired');

  const resendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/invitations/${id}/resend`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invitations', type] }),
    onError: (err) => setError(getErrorMessage(err)),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/invitations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invitations', type] }),
    onError: (err) => setError(getErrorMessage(err)),
  });

  if (pending.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">
          Pending invitation{pending.length !== 1 ? 's' : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {error && <p className="px-4 pt-4 text-xs text-terracotta-600">{error}</p>}
        <div className="divide-y divide-ink-200">
          {pending.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-ink-100">
                  <Mail size={14} className="text-ink-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-900">{invite.email}</p>
                  <p className="text-xs text-ink-400">
                    Sent {formatDistanceToNow(new Date(invite.createdAt), { addSuffix: true })}
                    {invite.status === 'expired' ? ' · expired' : ` · expires ${formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[invite.status]}>{invite.status}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resendMutation.mutate(invite.id)}
                  disabled={resendMutation.isPending}
                  title="Resend invitation"
                >
                  <RotateCw size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeMutation.mutate(invite.id)}
                  disabled={revokeMutation.isPending}
                  className="text-terracotta-600 hover:bg-terracotta-100"
                  title="Revoke invitation"
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
