import { useEffect } from 'react';
import { useThemeStore } from '@/store/theme';

/**
 * Pins the document to the light theme for as long as the calling component
 * is mounted, regardless of the user's saved preference — for surfaces that
 * are explicitly out of dark-mode scope (the public landing page, legal
 * pages, and the pre-auth Login/Signup/Accept-invite screens, none of which
 * expose a theme toggle). Restores whatever theme was actually active on
 * unmount, so navigating on to the authenticated app respects the user's
 * real choice again.
 */
export function useForceLightTheme() {
  useEffect(() => {
    document.documentElement.dataset.theme = 'light';
    return () => {
      document.documentElement.dataset.theme = useThemeStore.getState().resolved;
    };
  }, []);
}
