import { NotificationBell } from '@/components/NotificationBell';
import { ProfileMenu } from '@/components/ProfileMenu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BrandMark } from '@/components/brand/BrandMark';

interface TopBarProps {
  /** Client portal has no internal notification bell — studio-side only. */
  showNotifications?: boolean;
  profileHref?: string;
}

function OpenPanelButton() {
  if (!window.portico) return null; // no floating panel to open outside the Electron shell
  return (
    <button
      type="button"
      onClick={() => window.portico?.panel.toggle()}
      data-tour-id="topbar.panel"
      className="flex h-9 w-9 items-center justify-center rounded-sm text-ink-500 transition-all duration-hover ease-brand hover:bg-ink-100 hover:text-ink-800"
      title="Open Portico panel (Ctrl+Shift+P)"
    >
      <BrandMark size={18} tone="ink" />
    </button>
  );
}

export function TopBar({ showNotifications = true, profileHref = '/settings' }: TopBarProps) {
  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-end gap-2 border-b border-ink-200 bg-bone-50 px-6">
      {showNotifications && <OpenPanelButton />}
      {/* Wrappers rather than props: these three each own their root element's className.
          `inline-flex` (never `display: contents`, which has no box at all) keeps them
          measurable — the anchor resolver rejects any element whose rect is zero-sized. */}
      {showNotifications && (
        <span data-tour-id="topbar.notifications" className="inline-flex">
          <NotificationBell />
        </span>
      )}
      <span data-tour-id="topbar.theme" className="inline-flex">
        <ThemeToggle />
      </span>
      <span data-tour-id="topbar.profile" className="inline-flex">
        <ProfileMenu profileHref={profileHref} />
      </span>
    </header>
  );
}
