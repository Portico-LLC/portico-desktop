import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { useCommandPaletteStore } from '@/store/commandPalette';
import { CommandPalette } from '@/components/command/CommandPalette';

/** Mounted once at the app root — handles the global ⌘K/Ctrl+K listener and renders the
 *  (closed by default) command palette dialog. No-ops entirely when logged out. */
export function CommandPaletteProvider() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const open = useCommandPaletteStore((s) => s.open);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const toggle = useCommandPaletteStore((s) => s.toggle);

  useEffect(() => {
    if (!isAuthenticated) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAuthenticated, toggle]);

  if (!isAuthenticated) return null;
  return <CommandPalette open={open} onOpenChange={setOpen} />;
}
