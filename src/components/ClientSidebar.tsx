import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  CheckSquare,
  FileText,
  FileStack,
  MessageSquare,
  Brain,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from './SidebarContext';
import { useAuthStore } from '@/store/auth';
import { useCommandPaletteStore } from '@/store/commandPalette';
import { BrandMark } from '@/components/brand/BrandMark';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
}

const navItems: NavItem[] = [
  { label: 'Overview', icon: <LayoutDashboard size={18} />, href: '/portal' },
  { label: 'Brain', icon: <Brain size={18} />, href: '/portal/brain' },
  { label: 'Projects', icon: <Briefcase size={18} />, href: '/portal/projects' },
  { label: 'Tasks', icon: <CheckSquare size={18} />, href: '/portal/tasks' },
  { label: 'Invoices', icon: <FileText size={18} />, href: '/portal/invoices' },
  { label: 'Messages', icon: <MessageSquare size={18} />, href: '/portal/team-chat' },
  { label: 'Vault', icon: <Shield size={18} />, href: '/portal/vault' },
  { label: 'Documents', icon: <FileStack size={18} />, href: '/portal/documents' },
];

export function ClientSidebar() {
  const { isCollapsed, toggleCollapsed } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const openCommandPalette = useCommandPaletteStore((s) => s.setOpen);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (href: string) =>
    href === '/portal' ? location.pathname === '/portal' : location.pathname.startsWith(href);

  return (
    <aside
      className={cn(
        'fixed left-0 top-[var(--app-titlebar-height)] h-[calc(100vh-var(--app-titlebar-height))] bg-[var(--chrome-bg)] text-[var(--chrome-text)] border-r border-[var(--chrome-border)] transition-all duration-transition ease-brand flex flex-col z-40',
        isCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'h-16 flex items-center border-b border-[var(--chrome-border)]',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <BrandMark size={36} tone="bone" className="flex-shrink-0" />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-display text-lg font-medium leading-none tracking-tight text-[var(--chrome-text)] truncate">
                Portico
              </span>
              <span className="text-[10px] text-[var(--chrome-text-faint)] mt-0.5 uppercase tracking-wider">
                Client Portal
              </span>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button
            onClick={toggleCollapsed}
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-sm text-[var(--chrome-text-faint)] hover:text-[var(--chrome-text)] hover:bg-[var(--chrome-border)] transition-all duration-hover ease-brand"
            title="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Expand toggle when collapsed */}
      {isCollapsed && (
        <div className="flex justify-center py-2 border-b border-[var(--chrome-border)]">
          <button
            onClick={toggleCollapsed}
            className="flex items-center justify-center w-10 h-8 rounded-sm text-[var(--chrome-text-faint)] hover:text-[var(--chrome-text)] hover:bg-[var(--chrome-border)] transition-all duration-hover ease-brand"
            title="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Search / command palette */}
      <div className={cn('px-2 pt-3', isCollapsed && 'flex justify-center')}>
        <button
          onClick={() => openCommandPalette(true)}
          title="Search (⌘K)"
          className={cn(
            'flex items-center gap-2 rounded-sm text-sm text-[var(--chrome-text-faint)] transition-all duration-hover ease-brand hover:bg-[var(--chrome-border)] hover:text-[var(--chrome-text)]',
            isCollapsed ? 'h-9 w-10 justify-center' : 'w-full px-3 py-2'
          )}
        >
          <Search size={16} className="flex-shrink-0" />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">Search</span>
              <kbd className="rounded-sm border border-[var(--chrome-border-soft)] bg-[var(--chrome-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--chrome-text-faint)]">
                ⌘K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="no-scrollbar flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-sm text-sm font-medium transition-all duration-hover ease-brand before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-[var(--chrome-accent)] before:transition-opacity before:duration-hover before:ease-brand',
                isCollapsed ? 'justify-center px-0 py-2.5 mx-1' : 'px-3 py-2.5',
                active
                  ? 'bg-[var(--chrome-active-bg)] text-[var(--chrome-text)] before:opacity-100'
                  : 'text-[var(--chrome-text-muted)] hover:bg-[var(--chrome-border)] hover:text-[var(--chrome-text)] before:opacity-0 hover:before:opacity-50'
              )}
            >
              <span className="transition-transform duration-hover ease-brand group-hover:translate-x-0.5">
                {item.icon}
              </span>
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 pt-4 pb-2 border-t border-[var(--chrome-border)]">
        <button
          onClick={handleLogout}
          title="Log out"
          className={cn(
            'group flex items-center gap-3 rounded-sm text-sm font-medium transition-all duration-hover ease-brand w-full',
            isCollapsed ? 'justify-center px-0 py-2.5 mx-1' : 'px-3 py-2.5',
            'text-[var(--chrome-danger)] hover:bg-[var(--chrome-danger)]/10 hover:text-[var(--chrome-danger-hover)]'
          )}
        >
          <span className="transition-transform duration-hover ease-brand group-hover:translate-x-0.5">
            <LogOut size={18} />
          </span>
          {!isCollapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
