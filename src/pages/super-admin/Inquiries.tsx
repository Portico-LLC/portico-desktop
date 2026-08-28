import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, Inbox, Reply } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import type { Inquiry, InquiryStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';

const STATUS_BADGE: Record<InquiryStatus, { label: string; variant: 'brass' | 'moss' | 'neutral' }> = {
  new: { label: 'New', variant: 'brass' },
  replied: { label: 'Replied', variant: 'moss' },
  archived: { label: 'Archived', variant: 'neutral' },
};

export function Inquiries() {
  const queryClient = useQueryClient();
  const [activeInquiry, setActiveInquiry] = useState<Inquiry | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ['super-admin', 'inquiries'],
    queryFn: () => api.get<Inquiry[]>('/super-admin/inquiries').then((res) => res.data),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['super-admin', 'inquiries'] });

  const reply = useMutation({
    mutationFn: ({ id, replyMessage }: { id: string; replyMessage: string }) =>
      api.post(`/super-admin/inquiries/${id}/reply`, { replyMessage }),
    onSuccess: () => {
      invalidate();
      setActiveInquiry(null);
      setReplyMessage('');
    },
    meta: { successMessage: 'Reply sent', errorTitle: 'Could not send reply' },
  });

  const archive = useMutation({
    mutationFn: (id: string) => api.post(`/super-admin/inquiries/${id}/archive`),
    onSuccess: invalidate,
    meta: { successMessage: 'Inquiry archived', errorTitle: 'Could not archive inquiry' },
  });

  const openReply = (inquiry: Inquiry) => {
    setActiveInquiry(inquiry);
    setReplyMessage('');
  };

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
        <h1 className="font-display text-3xl font-medium text-bone-50">Inquiries</h1>
        <p className="mt-1 text-sm text-ink-400">
          {inquiries.length} message{inquiries.length !== 1 ? 's' : ''} submitted through the landing page contact
          form.
        </p>
      </div>

      {inquiries.length === 0 ? (
        <Card className="border-ink-800 bg-ink-900 p-12 text-center hover:shadow-none hover:translate-y-0">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-ink-700" />
          <p className="text-sm text-ink-500">No inquiries yet.</p>
        </Card>
      ) : (
        <Card className="border-ink-800 bg-ink-900 hover:shadow-none hover:translate-y-0">
          <CardHeader className="border-ink-800">
            <CardTitle className="text-bone-50">All inquiries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-ink-800">
              {inquiries.map((inquiry) => {
                const badge = STATUS_BADGE[inquiry.status];
                return (
                  <div key={inquiry.id} className="flex items-start justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-bone-50">{inquiry.name}</p>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <p className="truncate text-sm text-ink-500">
                        {inquiry.email} · {formatDistanceToNow(new Date(inquiry.createdAt), { addSuffix: true })}
                      </p>
                      <p className="mt-1.5 line-clamp-2 max-w-2xl text-sm text-ink-300">{inquiry.message}</p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {inquiry.status !== 'archived' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="border-ink-700 bg-ink-800 text-bone-100 hover:bg-ink-700"
                          onClick={() => archive.mutate(inquiry.id)}
                          disabled={archive.isPending}
                        >
                          <Archive size={14} />
                          Archive
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        className="bg-brass-600 hover:bg-brass-700"
                        onClick={() => openReply(inquiry)}
                      >
                        <Reply size={14} />
                        Reply
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!activeInquiry} onOpenChange={(open) => !open && setActiveInquiry(null)}>
        <DialogContent className="border-ink-800 bg-ink-900">
          <DialogHeader>
            <DialogTitle className="text-bone-50">Reply to {activeInquiry?.name}</DialogTitle>
            <DialogDescription className="text-ink-400">{activeInquiry?.email}</DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-ink-800 bg-ink-950/60 p-3 text-sm leading-relaxed text-ink-300">
            {activeInquiry?.message}
          </div>

          {activeInquiry?.replyMessage && (
            <div className="rounded-md border border-brass-800/40 bg-brass-900/10 p-3 text-xs leading-relaxed text-ink-400">
              <span className="font-medium text-brass-500">Previously replied:</span> {activeInquiry.replyMessage}
            </div>
          )}

          <Textarea
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder="Write your reply — it's sent from the same address configured for Portico's outgoing mail."
            className="min-h-[140px] border-ink-700 bg-ink-950 text-bone-100 placeholder:text-ink-500"
          />

          <DialogFooter>
            <Button
              variant="secondary"
              className="border-ink-700 bg-ink-800 text-bone-100 hover:bg-ink-700"
              onClick={() => setActiveInquiry(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-brass-600 hover:bg-brass-700"
              disabled={!replyMessage.trim() || reply.isPending}
              onClick={() => activeInquiry && reply.mutate({ id: activeInquiry.id, replyMessage: replyMessage.trim() })}
            >
              Send reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
