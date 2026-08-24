import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { ListChecks, Calendar, MessageSquare, FolderKanban, Shield, Video, Settings2, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandMark } from '@/components/brand/BrandMark';
import { NotificationBell } from '@/components/NotificationBell';
import { springs } from '@/lib/motion/springs';
import type { PanelPrefs } from '@/types/electron';

// Electron's frameless-window drag region isn't part of React's CSSProperties
// typings — cast through unknown rather than widen the type everywhere.
const dragStyle = { WebkitAppRegion: 'drag' } as unknown as CSSProperties;
const noDragStyle = { WebkitAppRegion: 'no-drag' } as unknown as CSSProperties;

type PanelTab = PanelPrefs['activeTab'];

const TABS: { id: PanelTab; label: string; icon: typeof ListChecks }[] = [
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'vault', label: 'Vault', icon: Shield },
  { id: 'record', label: 'Record', icon: Video },
  { id: 'preferences', label: 'Preferences', icon: Settings2 },
];

export function PanelHeader({
  activeTab,
  onTabChange,
}: {
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
}) {
  return (
    <div
      className="flex flex-shrink-0 items-center justify-between border-b border-[var(--chrome-border-highlight)] bg-[var(--chrome-bg)] px-3 py-2.5"
      style={dragStyle}
    >
      <div className="flex items-center gap-2" style={noDragStyle}>
        <BrandMark size={20} tone="bone" />
        <span className="font-display text-sm font-medium text-[var(--chrome-text)]">Portico</span>
      </div>

      <div className="relative flex items-center gap-0.5" style={noDragStyle}>
        {/* Sliding active-tab pill, behind the icons — animated via
            framer-motion's `animate` prop (not a hand-computed CSS
            transition), so rapid tab-switching redirects mid-flight with
            real spring physics instead of restarting from a standing start. */}
        <motion.div
          animate={{ x: TABS.findIndex((t) => t.id === activeTab) * 30 }}
          transition={springs.snappy}
          className="pointer-events-none absolute left-0 top-0 h-7 w-7 rounded-sm bg-[var(--chrome-active-bg)]"
        />
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            onClick={() => onTabChange(id)}
            className={cn(
              'relative flex h-7 w-7 items-center justify-center rounded-sm transition-[color,transform] duration-hover ease-brand active:scale-95 active:duration-press',
              activeTab === id
                ? 'text-[var(--chrome-text)]'
                : 'text-[var(--chrome-text-faint)] hover:bg-[var(--chrome-border)] hover:text-[var(--chrome-text)]'
            )}
          >
            <Icon size={14} />
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
