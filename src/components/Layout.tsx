import { Outlet } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useSidebar } from './SidebarContext';
import { NotificationToast } from './NotificationToast';
import { useNotificationsSocket } from '@/hooks/useNotificationsSocket';
import { motionTransition, springs } from '@/lib/motion/springs';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';

export function Layout() {
  const { isCollapsed } = useSidebar();
  const reduce = !!useReducedMotion();
  useNotificationsSocket();

  return (
    <div className="flex h-[calc(100vh-var(--app-titlebar-height))] bg-bone-50 overflow-hidden">
      <Sidebar />
      <motion.main
        animate={{ marginLeft: isCollapsed ? 64 : 240 }}
        transition={motionTransition(reduce, springs.reposition)}
        className="flex flex-1 min-w-0 flex-col"
      >
        <TopBar />
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </motion.main>
      <NotificationToast />
      {/* Mounted here rather than in App: this shell only renders for an authenticated studio
          session, which structurally excludes the frameless Electron panel and source-picker
          windows (declared outside it) along with login and the landing page. */}
      <OnboardingProvider />
    </div>
  );
}
