import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Building2 } from 'lucide-react';
import { api, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { AuthResponse, InvitationPreview } from '@/lib/types';
import { AuthCard } from '@/components/auth/AuthCard';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Skeleton } from '@/components/ui/Skeleton';
import { Logo } from '@/components/brand/Logo';

const acceptSchema = z
  .object({
    password: z.string().min(6, 'At least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type AcceptForm = z.infer<typeof acceptSchema>;

export function AcceptInvite() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const completeAuth = useAuthStore((s) => s.completeAuth);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    data: invite,
    isLoading,
    error: previewError,
  } = useQuery({
    queryKey: ['invitation-preview', token],
    queryFn: () => api.get<InvitationPreview>(`/invitations/${token}`).then((res) => res.data),
    retry: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptForm>({ resolver: zodResolver(acceptSchema) });

  const finish = (auth: AuthResponse) => {
    completeAuth(auth);
    navigate(invite?.type === 'client' ? '/portal' : '/', { replace: true });
  };

  const onSubmit = async (values: AcceptForm) => {
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await api.post<AuthResponse>(`/invitations/${token}/accept`, {
        password: values.password,
      });
      finish(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <AuthCard logo={<Logo tone="ink" markSize={40} />} title="Loading invitation…">
          <Skeleton className="h-10 w-full mb-3" />
          <Skeleton className="h-10 w-full mb-3" />
          <Skeleton className="h-10 w-full" />
        </AuthCard>
      </div>
    );
  }

  if (previewError || !invite) {
    return (
      <div className="w-full">
        <AuthCard logo={<Logo tone="ink" markSize={40} />} eyebrow="Invitation" title="This link isn't valid">
          <div className="flex items-start gap-2.5 rounded-md border border-terracotta-500/30 bg-terracotta-100/60 px-3.5 py-3 text-sm text-terracotta-600">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{getErrorMessage(previewError) || 'This invitation link is invalid, expired, or has already been used.'}</span>
          </div>
          <p className="mt-6 text-center text-sm text-ink-500">
            <Link to="/login" className="font-medium text-brass-700 hover:text-brass-800">
              Back to sign in
            </Link>
          </p>
        </AuthCard>
      </div>
    );
  }

  const roleLabel = invite.type === 'employee' ? 'team member' : 'client';

  return (
    <div className="w-full">
      <AuthCard
        logo={<Logo tone="ink" markSize={40} />}
        eyebrow="You're invited"
        title={`Join ${invite.studioName}`}
        subtitle={`Set up your account to join as a ${roleLabel}.`}
      >
        <div className="mb-6 flex items-center gap-3 rounded-md border border-ink-200 bg-ink-50 px-3.5 py-3">
          <Building2 size={16} className="flex-shrink-0 text-ink-400" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink-900">{invite.email}</p>
            <p className="text-xs text-ink-400">Invited as a {roleLabel}</p>
          </div>
        </div>

        <GoogleButton
          role={invite.type}
          inviteToken={token}
          label="Continue with Google"
          onSuccess={finish}
          onError={setError}
          className="mb-5"
        />

        <div className="mb-5 flex items-center justify-center gap-3">
          <span className="h-px flex-1 bg-ink-200" />
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">or set a password</span>
          <span className="h-px flex-1 bg-ink-200" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              placeholder="At least 6 characters"
              autoComplete="new-password"
              register={register('password')}
            />
            {errors.password && <p className="text-xs text-terracotta-600">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              register={register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-terracotta-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-md border border-terracotta-500/30 bg-terracotta-100/60 px-3.5 py-3 text-sm text-terracotta-600">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Setting up your account…' : 'Accept invitation'}
          </Button>
        </form>
      </AuthCard>
    </div>
  );
}
