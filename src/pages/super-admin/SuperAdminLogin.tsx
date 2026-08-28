import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { useSuperAdminAuthStore } from '@/store/superAdminAuth';
import { getErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { BrandMark } from '@/components/brand/BrandMark';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

export function SuperAdminLogin() {
  const navigate = useNavigate();
  const login = useSuperAdminAuthStore((s) => s.login);
  const isAuthenticated = useSuperAdminAuthStore((s) => s.isAuthenticated);
  const isLoading = useSuperAdminAuthStore((s) => s.isLoading);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (isAuthenticated) return <Navigate to="/super-admin" replace />;

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      await login(values.email, values.password);
      navigate('/super-admin', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-6">
      <div className="w-full max-w-sm">
        <div className="animate-fade-up relative overflow-hidden rounded-lg border border-ink-800 bg-ink-900 p-8 shadow-lg">
          <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-brass-500" />

          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <BrandMark size={44} tone="bone" />
            <div>
              <p className="mb-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-400">
                <ShieldCheck size={12} /> Super Admin
              </p>
              <h1 className="font-display text-2xl font-medium tracking-[-0.02em] text-bone-50">Control room</h1>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sa-email" className="text-ink-300">
                Email
              </Label>
              <Input id="sa-email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-xs text-terracotta-400">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sa-password" className="text-ink-300">
                Password
              </Label>
              <PasswordInput id="sa-password" autoComplete="current-password" register={register('password')} />
              {errors.password && <p className="text-xs text-terracotta-400">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="flex animate-fade-up items-start gap-2.5 rounded-md border border-terracotta-500/30 bg-terracotta-500/10 px-3.5 py-3 text-sm text-terracotta-400">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
