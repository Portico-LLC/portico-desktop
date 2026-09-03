import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ListChecks, Calendar, MessageSquare, FolderKanban, Shield, Video, Phone, Settings2, Minus, Gauge, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandMark } from '@/components/brand/BrandMark';
import { NotificationBell } from '@/components/NotificationBell';
import { springs } from '@/lib/motion/springs';
import { api } from '@/lib/api';
import type { AppNotification } from '@/lib/types';
import type { PanelPrefs } from '@/types/electron';

// Electron's frameless-window drag region isn't part of React's CSSProperties
// typings — cast through unknown rather than widen the type everywhere.
const dragStyle = { WebkitAppRegion: 'drag' } as unknown as CSSProperties;
const noDragStyle = { WebkitAppRegion: 'no-drag' } as unknown as CSSProperties;

type PanelTab = PanelPrefs['activeTab'];

// h-6/w-6 (24px) + the row's gap-0.5 (2px) = 26px per tab — down from the original 28px/30px.
// Adding a 9th tab (Radar) without this shrink plus dropping the wordmark below would push
// this bar past even the widest 480px window preset; both changes are required together, see
// the width note below `TAB_STEP_PX`.
const TAB_SIZE_PX = 24;
const TAB_STEP_PX = 26;

const BASE_TABS: { id: PanelTab; label: string; icon: typeof ListChecks }[] = [
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'radar', label: 'Radar', icon: Gauge },
  { id: 'calls', label: 'Calls', icon: Phone },
  { id: 'vault', label: 'Vault', icon: Shield },
  { id: 'record', label: 'Record', icon: Video },
  { id: 'preferences', label: 'Preferences', icon: Settings2 },
];

const STEWARD_TAB = { id: 'steward' as PanelTab, label: 'Steward', icon: Sparkles };

export function PanelHeader({
  activeTab,
  onTabChange,
}: {
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
}) {
  // The tab bar is already at capacity at 9 tabs even in the widest window preset (see
  // TAB_SIZE_PX above) — rather than shrink icons further or add a "more" overflow menu, Steward
  // only claims a slot when there's actually something to review. This also reads as thematically
  // consistent: Steward itself never writes a proposal when nothing warrants attention, so it's
  // quiet here too. Reads the same `['notifications']` cache the bell already keeps live over the
  // socket (`useNotificationsSocket`) — no extra fetch, no new socket wiring.
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<AppNotification[]>('/notifications').then((res) => res.data),
  });
  const hasPendingProposal = notifications.some((n) => n.type === 'agent_proposal' && !n.readAt);
  const TABS = hasPendingProposal ? [...BASE_TABS, STEWARD_TAB] : BASE_TABS;

  return (
    <div
      className="flex flex-shrink-0 items-center justify-between border-b border-[var(--chrome-border-highlight)] bg-[var(--chrome-bg)] px-3 py-2.5"
      style={dragStyle}
    >
      {/* Wordmark dropped (icon only) to make room for a 9th tab — this bar was already tight
          at 8 tabs against the 360px default window width; see TAB_SIZE_PX above. */}
      <div className="flex items-center" style={noDragStyle}>
        <BrandMark size={20} tone="bone" />
      </div>

      <div className="relative flex items-center gap-0.5" style={noDragStyle}>
        {/* Sliding active-tab pill, behind the icons — animated via
            framer-motion's `animate` prop (not a hand-computed CSS
            transition), so rapid tab-switching redirects mid-flight with
            real spring physics instead of restarting from a standing start. */}
        <motion.div
          animate={{ x: TABS.findIndex((t) => t.id === activeTab) * TAB_STEP_PX }}
          transition={springs.snappy}
          className="pointer-events-none absolute left-0 top-0 rounded-sm bg-[var(--chrome-active-bg)]"
          style={{ height: TAB_SIZE_PX, width: TAB_SIZE_PX }}
        />
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            onClick={() => onTabChange(id)}
            className={cn(
              'relative flex items-center justify-center rounded-sm transition-[color,transform] duration-hover ease-brand active:scale-95 active:duration-press',
              activeTab === id
                ? 'text-[var(--chrome-text)]'
                : 'text-[var(--chrome-text-faint)] hover:bg-[var(--chrome-border)] hover:text-[var(--chrome-text)]'
            )}
            style={{ height: TAB_SIZE_PX, width: TAB_SIZE_PX }}
          >
            <Icon size={13} />
          </button>
        ))}
        <NotificationBell variant="panel" />
        <button
          type="button"
          title="Hide panel"
          aria-label="Hide panel"
          onClick={() => window.portico?.panel.hide()}
          className="ml-1 flex h-7 w-7 items-center justify-center rounded-sm text-[var(--chrome-text-faint)] transition-[color,transform] duration-hover ease-brand hover:bg-[var(--chrome-border)] hover:text-[var(--chrome-text)] active:scale-95 active:duration-press"
        >
          <Minus size={14} />
        </button>
      </div>
    </div>
  );
}
