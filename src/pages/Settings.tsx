import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Loader2, AlertCircle, Check } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { api, getErrorMessage } from '@/lib/api';
import type { Employee } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Avatar } from '@/components/ui/Avatar';
import { PasswordChangeCard } from '@/components/settings/PasswordChangeCard';

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  company: z.string().optional(),
  phone: z.string().optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

export function Settings() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const isOwner = role === 'user';
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const uploadAvatar = useAuthStore((s) => s.uploadAvatar);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get<Employee[]>('/employees').then((res) => res.data),
    enabled: isOwner,
  });

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      company: user?.company ?? '',
      phone: user?.phone ?? '',
    },
  });

  const displayName = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'User';

  const onSubmit = async (data: ProfileForm) => {
    setSaveError(null);
    setSaved(false);
    try {
      await updateProfile(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(getErrorMessage(err));
    }
  };

  const onPickAvatar = () => fileInputRef.current?.click();

  const onAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarError(null);
    setAvatarUploading(true);
    try {
      await uploadAvatar(file);
    } catch (err) {
      setAvatarError(getErrorMessage(err));
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-semibold text-ink-900 mb-2">Settings</h1>
        <p className="text-ink-600">Manage your workspace, billing, and account settings.</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex items-center gap-4">
              <div className="relative">
                <Avatar name={displayName} src={user?.avatarUrl} size="lg" className="h-16 w-16 text-lg" />
                <button
                  type="button"
                  onClick={onPickAvatar}
                  disabled={avatarUploading}
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-ink-200 bg-bone-50 text-ink-600 shadow-sm transition-all duration-hover ease-brand hover:border-brass-400 hover:text-brass-700 disabled:opacity-50"
                  title="Change photo"
                >
                  {avatarUploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={onAvatarSelected}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-900">{displayName}</p>
                <p className="text-xs text-ink-400">{user?.email}</p>
                {avatarError && <p className="mt-1 text-xs text-terracotta-600">{avatarError}</p>}
              </div>
            </div>

            {isOwner ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input id="firstName" {...register('firstName')} />
                    {errors.firstName && <p className="text-xs text-terracotta-600">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input id="lastName" {...register('lastName')} />
                    {errors.lastName && <p className="text-xs text-terracotta-600">{errors.lastName.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email ?? ''} disabled />
                  <p className="text-xs text-ink-400">Contact support to change your email address.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" placeholder="Studio Name" {...register('company')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" placeholder="+1 (555) 000-0000" {...register('phone')} />
                  </div>
                </div>

                {saveError && (
                  <div className="flex items-start gap-2.5 rounded-md border border-terracotta-500/30 bg-terracotta-100/60 px-3.5 py-3 text-sm text-terracotta-600">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{saveError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  {saved && (
                    <span className="flex items-center gap-1.5 text-sm text-moss-600">
                      <Check size={14} />
                      Saved
                    </span>
                  )}
                  <Button type="submit" variant="primary" disabled={!isDirty || isSubmitting}>
                    {isSubmitting ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-ink-400">
                Your name and contact details are managed by your studio owner — contact them to make changes. You
                can update your photo above.
              </p>
            )}
          </CardContent>
        </Card>

        <PasswordChangeCard />

        {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Billing & Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-ink-500">Billing settings coming soon...</p>
          </CardContent>
        </Card>
        )}

        {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-ink-500">
                {employees.length} employee{employees.length !== 1 ? 's' : ''} on your team.
              </p>
              <Link to="/team">
                <Button variant="secondary" size="sm">
                  Manage team
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}
