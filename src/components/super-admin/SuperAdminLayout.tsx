import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Building2, ShieldCheck, LogOut, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSuperAdminAuthStore } from '@/store/superAdminAuth';
import { BrandMark } from '@/components/brand/BrandMark';

const NAV = [
  { label: 'Companies', href: '/super-admin', icon: Building2, end: true },
  { label: 'Signup Requests', href: '/super-admin/requests', icon: Inbox },
];

export function SuperAdminLayout() {
  const navigate = useNavigate();
  const user = useSuperAdminAuthStore((s) => s.user);
  const logout = useSuperAdminAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    navigate('/super-admin/login');
  };

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="border-b border-ink-800 bg-ink-900">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <BrandMark size={28} tone="bone" />
              <div className="flex flex-col leading-none">
                <span className="font-display text-base font-medium text-bone-50">Portico</span>
                <span className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brass-400">
                  <ShieldCheck size={10} /> Super Admin
                </span>
              </div>
            </div>

            <nav className="flex items-center gap-1">
              {NAV.map(({ label, href, icon: Icon, end }) => (
                <NavLink
                  key={href}
                  to={href}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors duration-hover ease-brand',
                      isActive ? 'bg-ink-800 text-bone-50' : 'text-ink-400 hover:bg-ink-800/60 hover:text-bone-100'
                    )
                  }
                >
                  <Icon size={15} />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {user && <span className="text-sm text-ink-400">{user.email}</span>}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium text-ink-400 transition-colors duration-hover ease-brand hover:bg-terracotta-500/10 hover:text-terracotta-400"
            >
              <LogOut size={15} />
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
