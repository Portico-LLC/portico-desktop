import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth';
import { getErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { AuthCard } from '@/components/auth/AuthCard';
import { GoogleButton } from '@/components/auth/GoogleButton';
import type { GoogleAuthResult } from '@/lib/googleAuth';
import { Logo } from '@/components/brand/Logo';
import { User, Mail, Building2, AlertCircle, ArrowRight, MailCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const signupSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  company: z.string().optional(),
});

type SignupForm = z.infer<typeof signupSchema>;

const STRENGTH_LABELS = ['', 'Too short', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', 'bg-terracotta-500', 'bg-ochre-500', 'bg-brass-500', 'bg-brass-500', 'bg-moss-500'];
const STRENGTH_TEXT = ['', 'text-terracotta-600', 'text-ochre-600', 'text-brass-700', 'text-brass-700', 'text-moss-600'];

function getStrength(pw: string): { score: number; label: string } {
  if (!pw) return { score: 0, label: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  score = Math.max(1, Math.min(5, score));
  return { score, label: STRENGTH_LABELS[score] };
}

export function Signup() {
  const navigate = useNavigate();
  const registerFn = useAuthStore((s) => s.register);
  const completeAuth = useAuthStore((s) => s.completeAuth);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const handleGoogleSuccess = (result: GoogleAuthResult) => {
    setError(null);
    if ('pending' in result) {
      setSubmitted(true);
      return;
    }
    // An existing, already-approved owner used "Sign up with Google" —
    // treat it the same as signing in.
    completeAuth(result, remember);
    navigate('/', { replace: true });
  };

  const {
    register: field,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const strength = getStrength(watch('password') ?? '');

  const onSubmit = async (values: SignupForm) => {
    setError(null);
    try {
      await registerFn(values);
      setSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (submitted) {
    return (
      <div className="w-full">
        <AuthCard logo={<Logo tone="ink" markSize={40} />} eyebrow="Request submitted" title="You're on the list">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-moss-100 text-moss-600">
              <MailCheck size={26} />
            </span>
            <p className="text-sm leading-relaxed text-ink-600">
              A Portico admin reviews every new workspace before it goes live.
              We'll email you the moment yours is approved — usually quick.
            </p>
            <Link
              to="/login"
              className="mt-2 text-sm font-medium text-brass-700 transition-colors duration-hover ease-brand hover:text-brass-800"
            >
              Back to sign in
            </Link>
          </div>
        </AuthCard>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AuthCard
        logo={<Logo tone="ink" markSize={40} />}
        eyebrow="Create your workspace"
        title="Start managing work"
        subtitle="Clients, projects, invoices, and messages in one calm workspace."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input
                  id="firstName"
                  placeholder="Ada"
                  autoComplete="given-name"
                  className="pl-10"
                  {...field('firstName')}
                />
              </div>
              {errors.firstName && (
                <p className="text-xs text-terracotta-600">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input
                  id="lastName"
                  placeholder="Lovelace"
                  autoComplete="family-name"
                  className="pl-10"
                  {...field('lastName')}
                />
              </div>
              {errors.lastName && (
                <p className="text-xs text-terracotta-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@studio.com"
                autoComplete="email"
                className="pl-10"
                {...field('email')}
              />
            </div>
            {errors.email && <p className="text-xs text-terracotta-600">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">
              Company <span className="font-normal text-ink-400">(optional)</span>
            </Label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <Input
                id="company"
                placeholder="Studio Name"
                autoComplete="organization"
                className="pl-10"
                {...field('company')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {strength.label && (
                <span className={cn('text-xs font-medium', STRENGTH_TEXT[strength.score])}>
                  {strength.label}
                </span>
              )}
            </div>
            <PasswordInput
              id="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              register={field('password')}
            />
            {errors.password && (
              <p className="text-xs text-terracotta-600">{errors.password.message}</p>
            )}
            {/* Strength meter */}
            <div className="flex gap-1.5 pt-1" aria-hidden>
              {[1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors duration-hover ease-brand',
                    i <= strength.score ? STRENGTH_COLORS[strength.score] : 'bg-ink-200'
                  )}
                />
              ))}
            </div>
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

          {error && (
            <div className="flex animate-fade-up items-start gap-2.5 rounded-md border border-terracotta-500/30 bg-terracotta-100/60 px-3.5 py-3 text-sm text-terracotta-600">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating workspace…' : 'Create workspace'}
            {!isLoading && <ArrowRight size={16} />}
          </Button>

          <div className="flex items-center justify-center gap-3 pt-1">
            <span className="h-px flex-1 bg-ink-200" />
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">or</span>
            <span className="h-px flex-1 bg-ink-200" />
          </div>

          <GoogleButton role="owner" label="Sign up with Google" onSuccess={handleGoogleSuccess} onError={setError} />

          <p className="text-center text-xs text-ink-400">
            By creating a workspace, you agree to our{' '}
            <Link to="/terms" className="font-medium text-ink-600 hover:text-ink-900">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="font-medium text-ink-600 hover:text-ink-900">
              Privacy Policy
            </Link>
            .
          </p>

          <p className="text-center text-sm text-ink-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-brass-700 transition-colors duration-hover ease-brand hover:text-brass-800"
            >
              Sign in
            </Link>
          </p>
        </form>
      </AuthCard>
    </div>
  );
}
