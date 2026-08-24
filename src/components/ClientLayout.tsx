import { Outlet } from 'react-router-dom';
import { ClientSidebar } from './ClientSidebar';
import { TopBar } from './TopBar';
import { useSidebar } from './SidebarContext';
import { cn } from '@/lib/utils';

export function ClientLayout() {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex h-[calc(100vh-var(--app-titlebar-height))] bg-bone-50 overflow-hidden">
      <ClientSidebar />
      <main
        className={cn(
          'flex flex-1 min-w-0 flex-col transition-all duration-transition ease-brand',
          isCollapsed ? 'ml-16' : 'ml-60'
        )}
      >
        {/* No client-portal settings/profile page exists yet, so the avatar links to the dashboard rather than a dead route. */}
        <TopBar showNotifications={false} profileHref="/portal" />
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
