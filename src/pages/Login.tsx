import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth';
import { getErrorMessage } from '@/lib/api';
import type { GoogleAuthResult } from '@/lib/googleAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { AuthCard } from '@/components/auth/AuthCard';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { Logo } from '@/components/brand/Logo';
import { Mail, Users, KeyRound, UserCog, AlertCircle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;
type LoginMode = 'studio' | 'client' | 'employee';

const MODES = [
  { key: 'studio' as const, label: 'Studio Owner', icon: Users },
  { key: 'employee' as const, label: 'Team Member', icon: UserCog },
  { key: 'client' as const, label: 'Client', icon: KeyRound },
];

export function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const clientLogin = useAuthStore((s) => s.clientLogin);
  const employeeLogin = useAuthStore((s) => s.employeeLogin);
  const completeAuth = useAuthStore((s) => s.completeAuth);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [mode, setMode] = useState<LoginMode>('studio');
  const [error, setError] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState(false);
  const [remember, setRemember] = useState(true);

  const handleGoogleSuccess = (result: GoogleAuthResult) => {
    setError(null);
    if ('pending' in result) {
      setPendingNotice(true);
      return;
    }
    completeAuth(result, remember);
    navigate(mode === 'client' ? '/portal' : '/', { replace: true });
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginForm) => {
    setError(null);
    try {
      if (mode === 'client') {
        await clientLogin(values.email, values.password, remember);
        navigate('/portal', { replace: true });
      } else if (mode === 'employee') {
        await employeeLogin(values.email, values.password, remember);
        navigate('/', { replace: true });
      } else {
        await login(values.email, values.password, remember);
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="w-full">
      <AuthCard
        logo={<Logo tone="ink" markSize={40} />}
        eyebrow={mode === 'client' ? 'Client portal' : mode === 'employee' ? 'Team workspace' : 'Studio workspace'}
        title="Welcome back"
        subtitle={
          mode === 'client'
            ? 'Sign in to your client portal.'
            : mode === 'employee'
            ? 'Sign in to your team account.'
            : 'Sign in to your studio workspace.'
        }
      >
        {/* Role toggle */}
        <div className="mb-6 grid grid-cols-3 gap-1 rounded-md border border-ink-200 bg-ink-100 p-1">
          {MODES.map(({ key, label, icon: Icon }) => {
            const active = mode === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMode(key);
                  setError(null);
                }}
                className={cn(
                  'relative flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors duration-hover ease-brand',
                  active ? 'text-ink-900' : 'text-ink-500 hover:text-ink-800'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="login-mode-pill"
                    className="absolute inset-0 rounded-sm bg-bone-100 shadow-xs"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon
                  size={15}
                  className={cn(
                    'relative z-10 transition-colors duration-hover ease-brand',
                    active && 'text-brass-600'
                  )}
                />
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <Input
                id="email"
                type="email"
                placeholder={mode === 'client' ? 'you@company.com' : 'you@studio.com'}
                autoComplete="email"
                className="pl-10"
                {...register('email')}
              />
            </div>
            {errors.email && <p className="text-xs text-terracotta-600">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <a
                href="mailto:mouhanned.j18@gmail.com?subject=Password%20reset%20request"
                className="text-xs font-medium text-brass-700 transition-colors duration-hover ease-brand hover:text-brass-800"
              >
                Forgot password?
              </a>
            </div>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              autoComplete="current-password"
              register={register('password')}
            />
            {errors.password && (
              <p className="text-xs text-terracotta-600">{errors.password.message}</p>
            )}
          </div>

          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-ink-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded-sm border-ink-300 bg-bone-50 accent-brass-600 focus:ring-2 focus:ring-brass-200"
            />
            Keep me signed in
          </label>

          {pendingNotice && (
            <div className="flex animate-fade-up items-start gap-2.5 rounded-md border border-moss-500/30 bg-moss-100/60 px-3.5 py-3 text-sm text-moss-700">
              <ShieldCheck size={16} className="mt-0.5 flex-shrink-0" />
              <span>Your workspace request was submitted — we'll email you once it's approved.</span>
            </div>
          )}

          {error && (
            <div className="flex animate-fade-up items-start gap-2.5 rounded-md border border-terracotta-500/30 bg-terracotta-100/60 px-3.5 py-3 text-sm text-terracotta-600">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
            {isLoading
              ? 'Signing in…'
              : mode === 'client'
              ? 'Enter client portal'
              : mode === 'employee'
              ? 'Sign in to team account'
              : 'Sign in to workspace'}
          </Button>

          <div className="flex items-center justify-center gap-3 pt-1">
            <span className="h-px flex-1 bg-ink-200" />
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">
              or
            </span>
            <span className="h-px flex-1 bg-ink-200" />
          </div>

          <GoogleButton
            role={mode === 'studio' ? 'owner' : mode}
            onSuccess={handleGoogleSuccess}
            onError={setError}
          />

          <p className="flex items-center justify-center gap-1.5 text-center text-sm text-ink-500">
            {mode === 'client' || mode === 'employee' ? (
              <>
                <ShieldCheck size={14} className="text-ink-400" />
                Need access?{' '}
                <span className="font-medium text-brass-700">Contact your studio</span>
              </>
            ) : (
              <>
                New to Portico?{' '}
                <Link
                  to="/signup"
                  className="font-medium text-brass-700 transition-colors duration-hover ease-brand hover:text-brass-800"
                >
                  Create an account
                </Link>
              </>
            )}
          </p>
        </form>
      </AuthCard>
    </div>
  );
}
