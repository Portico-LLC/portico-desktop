import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Home,
  Activity,
  Inbox,
  Users,
  Briefcase,
  CheckSquare,
  FileText,
  FileStack,
  MessageSquare,
  Brain,
  Workflow,
  Settings,
  UserCog,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Search,
  LayoutTemplate,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motionTransition, springs } from '@/lib/motion/springs';
import { useSidebar } from './SidebarContext';
import { useAuthStore } from '@/store/auth';
import { useCommandPaletteStore } from '@/store/commandPalette';
import { BrandMark } from '@/components/brand/BrandMark';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const ownerNavSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: <Home size={18} />, href: '/' },
      { label: 'Pulse', icon: <Activity size={18} />, href: '/pulse' },
      { label: 'Inbox', icon: <Inbox size={18} />, href: '/inbox' },
      { label: 'Calendar', icon: <CalendarDays size={18} />, href: '/calendar' },
    ],
  },
  {
    label: 'Work',
    items: [
      { label: 'Projects', icon: <Briefcase size={18} />, href: '/projects' },
      { label: 'Tasks', icon: <CheckSquare size={18} />, href: '/tasks' },
      { label: 'Templates', icon: <LayoutTemplate size={18} />, href: '/project-templates' },
      { label: 'Automations', icon: <Workflow size={18} />, href: '/automations' },
    ],
  },
  {
    label: 'Clients',
    items: [
      { label: 'Clients', icon: <Users size={18} />, href: '/clients' },
      { label: 'Invoices', icon: <FileText size={18} />, href: '/invoices' },
    ],
  },
  {
    label: 'Collaborate',
    items: [
      { label: 'Messages', icon: <MessageSquare size={18} />, href: '/team-chat' },
      { label: 'Brain', icon: <Brain size={18} />, href: '/brain' },
      { label: 'Vault', icon: <Shield size={18} />, href: '/vault' },
      { label: 'Documents', icon: <FileStack size={18} />, href: '/documents' },
    ],
  },
  {
    label: 'Team',
    items: [{ label: 'Team', icon: <UserCog size={18} />, href: '/team' }],
  },
];

const employeeNavSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: <Home size={18} />, href: '/' },
      { label: 'Pulse', icon: <Activity size={18} />, href: '/pulse' },
      { label: 'Inbox', icon: <Inbox size={18} />, href: '/inbox' },
    ],
  },
  {
    label: 'Work',
    items: [
      { label: 'Projects', icon: <Briefcase size={18} />, href: '/projects' },
      { label: 'Tasks', icon: <CheckSquare size={18} />, href: '/tasks' },
    ],
  },
  {
    label: 'Collaborate',
    items: [
      { label: 'Messages', icon: <MessageSquare size={18} />, href: '/team-chat' },
      { label: 'Vault', icon: <Shield size={18} />, href: '/vault' },
      { label: 'Documents', icon: <FileStack size={18} />, href: '/documents' },
    ],
  },
];

export function Sidebar() {
  const { isCollapsed, toggleCollapsed } = useSidebar();
  const reduce = !!useReducedMotion();
  const location = useLocation();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.role);
  const logout = useAuthStore((s) => s.logout);
  const openCommandPalette = useCommandPaletteStore((s) => s.setOpen);
  const sections = role === 'employee' ? employeeNavSections : ownerNavSections;
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const isItemActive = (item: NavItem) =>
    item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href);

  const toggleSection = (label: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderItem = (item: NavItem) => {
    const isActive = isItemActive(item);
    return (
      <Link
        key={item.href}
        to={item.href}
        className={cn(
          'group relative flex items-center gap-3 rounded-sm text-sm font-medium transition-all duration-hover ease-brand before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-[var(--chrome-accent)] before:transition-opacity before:duration-hover before:ease-brand',
          isCollapsed ? 'justify-center px-0 py-2.5 mx-1' : 'px-3 py-2.5',
          isActive
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
  };

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 64 : 240 }}
      transition={motionTransition(reduce, springs.reposition)}
      className="fixed left-0 top-[var(--app-titlebar-height)] h-[calc(100vh-var(--app-titlebar-height))] bg-[var(--chrome-bg)] text-[var(--chrome-text)] border-r border-[var(--chrome-border)] flex flex-col z-40 overflow-hidden"
    >
      {/* Logo / Brand */}
      <div className={cn(
        'h-16 flex items-center border-b border-[var(--chrome-border)]',
        isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
      )}>
        <div className="flex items-center gap-3 min-w-0">
          <BrandMark size={36} tone="bone" className="flex-shrink-0" />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-display text-lg font-medium leading-none tracking-tight text-[var(--chrome-text)] truncate">
                Portico
              </span>
              <span className="text-[10px] text-[var(--chrome-text-faint)] mt-0.5 uppercase tracking-wider">Portal</span>
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

      {/* Collapse toggle when collapsed */}
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
        {isCollapsed
          ? sections.flatMap((section) => section.items).map(renderItem)
          : sections.map((section) => {
              const hasActiveItem = section.items.some(isItemActive);
              const isOpen = hasActiveItem || !collapsedSections.has(section.label);
              return (
                <div key={section.label} className="pb-1">
                  <button
                    type="button"
                    onClick={() => toggleSection(section.label)}
                    className="flex w-full items-center justify-between rounded-sm px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--chrome-text-faint-2)] transition-colors duration-hover ease-brand hover:text-[var(--chrome-text-muted)]"
                  >
                    <span>{section.label}</span>
                    <ChevronDown
                      size={12}
                      className={cn('transition-transform duration-hover ease-brand', !isOpen && '-rotate-90')}
                    />
                  </button>
                  {isOpen && <div className="space-y-1">{section.items.map(renderItem)}</div>}
                </div>
              );
            })}
      </nav>

      {/* Settings */}
      <div className="px-2 pt-4 pb-2 border-t border-[var(--chrome-border)]">
        <Link
          to="/settings"
          className={cn(
            'group relative flex items-center gap-3 rounded-sm text-sm font-medium transition-all duration-hover ease-brand before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-[var(--chrome-accent)] before:transition-opacity before:duration-hover before:ease-brand',
            isCollapsed ? 'justify-center px-0 py-2.5 mx-1' : 'px-3 py-2.5',
            location.pathname === '/settings'
              ? 'bg-[var(--chrome-active-bg)] text-[var(--chrome-text)] before:opacity-100'
              : 'text-[var(--chrome-text-muted)] hover:bg-[var(--chrome-border)] hover:text-[var(--chrome-text)] before:opacity-0 hover:before:opacity-50'
          )}
        >
          <span className="transition-transform duration-hover ease-brand group-hover:translate-x-0.5">
            <Settings size={18} />
          </span>
          {!isCollapsed && <span>Settings</span>}
        </Link>

        {/* Logout */}
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
    </motion.aside>
  );
}
