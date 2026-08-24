import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Check } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { api, getErrorMessage } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { PasswordInput } from '@/components/auth/PasswordInput';

type PasswordForm = { currentPassword?: string; newPassword: string; confirmPassword: string };

function buildPasswordSchema(requireCurrent: boolean) {
  return z
    .object({
      currentPassword: z.string().optional(),
      newPassword: z.string().min(6, 'At least 6 characters'),
      confirmPassword: z.string().min(1, 'Please confirm your new password'),
    })
    .superRefine((data, ctx) => {
      if (requireCurrent && !data.currentPassword) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Current password is required', path: ['currentPassword'] });
      }
      if (data.newPassword !== data.confirmPassword) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Passwords do not match', path: ['confirmPassword'] });
      }
    }) satisfies z.ZodType<PasswordForm>;
}

export function PasswordChangeCard() {
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);
  const hasPassword = user?.hasPassword !== false;
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({ resolver: zodResolver(buildPasswordSchema(hasPassword)) });

  const onSubmit = async (data: PasswordForm) => {
    setError(null);
    setSaved(false);
    try {
      const endpoint = role === 'employee' ? '/employee/password' : '/auth/password';
      await api.patch(endpoint, {
        currentPassword: hasPassword ? data.currentPassword : undefined,
        newPassword: data.newPassword,
      });
      reset();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{hasPassword ? 'Password' : 'Set a password'}</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasPassword && (
          <p className="mb-4 text-sm text-ink-500">
            This account signs in with Google. Set a password here as a backup way to sign in.
          </p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {hasPassword && (
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <PasswordInput
                id="currentPassword"
                autoComplete="current-password"
                register={register('currentPassword')}
              />
              {errors.currentPassword && (
                <p className="text-xs text-terracotta-600">{errors.currentPassword.message}</p>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <PasswordInput id="newPassword" autoComplete="new-password" register={register('newPassword')} />
              {errors.newPassword && (
                <p className="text-xs text-terracotta-600">{errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <PasswordInput
                id="confirmPassword"
                autoComplete="new-password"
                register={register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-terracotta-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-md border border-terracotta-500/30 bg-terracotta-100/60 px-3.5 py-3 text-sm text-terracotta-600">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-moss-600">
                <Check size={14} />
                Password updated
              </span>
            )}
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : hasPassword ? 'Update password' : 'Set password'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
