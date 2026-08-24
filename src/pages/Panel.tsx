import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { usePanelPrefsStore } from '@/store/panelPrefs';
import { PanelFrame } from '@/components/panel/PanelFrame';
import { PanelShell } from '@/components/panel/PanelShell';
import { BrandMark } from '@/components/brand/BrandMark';
import { useNotificationsSocket } from '@/hooks/useNotificationsSocket';

export function Panel() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydratePrefs = usePanelPrefsStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [ready, setReady] = useState(false);

  // Live updates (unread badge + sound) for the panel's own notification bell —
  // the panel is a separate renderer from the main window, so it needs its own
  // socket subscription rather than inheriting the main window's.
  useNotificationsSocket();

  useEffect(() => {
    hydrateAuth();
    hydratePrefs();
    setReady(true);

    // The panel window shares localStorage with the main window's session but
    // is a separate renderer — re-check auth every time the window regains
    // focus so signing in on the main window "just works" on the next reopen
    // without restarting the app.
    const onFocus = () => hydrateAuth();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [hydrateAuth, hydratePrefs]);

  if (!ready) return null;

  return <PanelFrame>{isAuthenticated ? <PanelShell /> : <PanelSignedOutState />}</PanelFrame>;
}

function PanelSignedOutState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <BrandMark size={32} tone="ink" />
      <p className="text-sm font-medium text-ink-900">You're signed out</p>
      <p className="text-xs text-ink-500">Open Portico and sign in to use the panel.</p>
    </div>
  );
}
