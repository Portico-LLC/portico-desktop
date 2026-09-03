import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, ChevronDown, RotateCcw } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

interface ProfileMenuProps {
  profileHref?: string;
}

export function ProfileMenu({ profileHref = '/settings' }: ProfileMenuProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const requestReplay = useOnboardingStore((s) => s.requestReplay);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayName = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Account';

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleSettings = () => {
    setOpen(false);
    navigate(profileHref);
  };

  // Lives here rather than only in Settings because clients have no Settings page of their own
  // (their avatar links to the portal dashboard), and this menu is the one surface all three
  // roles share.
  const handleReplayTour = () => {
    setOpen(false);
    requestReplay();
  };

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2 rounded-full py-1 pl-2.5 pr-2 transition-all duration-hover ease-brand hover:bg-ink-100',
          open && 'bg-ink-100'
        )}
        title={displayName}
      >
        <div className="hidden flex-col items-end leading-tight sm:flex">
          <span className="text-sm font-medium text-ink-900">{displayName}</span>
          {user?.email && <span className="text-xs text-ink-400">{user.email}</span>}
        </div>
        <Avatar name={displayName} src={user?.avatarUrl} size="sm" />
        <ChevronDown
          size={14}
          className={cn('text-ink-400 transition-transform duration-hover ease-brand', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-64 animate-fade-up overflow-hidden rounded-md border border-ink-200 bg-bone-50 shadow-lg"
        >
          <div className="flex items-center gap-3 border-b border-ink-200 px-4 py-3">
            <Avatar name={displayName} src={user?.avatarUrl} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink-900">{displayName}</p>
              {user?.email && <p className="truncate text-xs text-ink-400">{user.email}</p>}
            </div>
          </div>
          <div className="py-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={handleSettings}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-ink-700 transition-colors duration-hover ease-brand hover:bg-ink-100 hover:text-ink-900"
            >
              <Settings size={16} className="text-ink-400" />
              Settings
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleReplayTour}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-ink-700 transition-colors duration-hover ease-brand hover:bg-ink-100 hover:text-ink-900"
            >
              <RotateCcw size={16} className="text-ink-400" />
              Replay walkthrough
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-terracotta-600 transition-colors duration-hover ease-brand hover:bg-terracotta-500/10 hover:text-terracotta-700"
            >
              <LogOut size={16} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
