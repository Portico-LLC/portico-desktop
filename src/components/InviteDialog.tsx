import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, getErrorMessage } from '@/lib/api';
import type { InvitationType } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Mail } from 'lucide-react';
import { useState } from 'react';

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  name: z.string().optional(),
});
type InviteForm = z.infer<typeof inviteSchema>;

interface InviteDialogProps {
  type: InvitationType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COPY: Record<InvitationType, { title: string; noun: string; placeholder: string }> = {
  employee: { title: 'Invite team member', noun: 'team member', placeholder: 'jane@studio.com' },
  client: { title: 'Invite client', noun: 'client', placeholder: 'jane@company.com' },
};

export function InviteDialog({ type, open, onOpenChange }: InviteDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[type];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteForm>({ resolver: zodResolver(inviteSchema) });

  const inviteMutation = useMutation({
    mutationFn: (data: InviteForm) => api.post('/invitations', { ...data, type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', type] });
      reset();
      onOpenChange(false);
    },
    onError: (err) => setError(getErrorMessage(err)),
    meta: { successMessage: 'Invite sent', suppressErrorToast: true },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => inviteMutation.mutate(data))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-name">Name (optional)</Label>
            <Input id="invite-name" placeholder="Jane Doe" {...register('name')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <Input id="invite-email" type="email" placeholder={copy.placeholder} className="pl-10" {...register('email')} />
            </div>
            {errors.email && <p className="text-xs text-terracotta-600">{errors.email.message}</p>}
          </div>
          <p className="text-xs text-ink-400">
            We'll email an invite link so this {copy.noun} can set up their own account.
          </p>
          {error && <p className="text-xs text-terracotta-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? 'Sending…' : 'Send invite'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
