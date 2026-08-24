import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getTeamChatSocket } from '@/lib/socket';
import { usePanelPrefsStore } from '@/store/panelPrefs';
import { useNotificationToastStore } from '@/store/notificationToast';
import type { AppNotification } from '@/lib/types';

let notificationAudio: HTMLAudioElement | null = null;
function playNotificationSound() {
  if (!notificationAudio) notificationAudio = new Audio('/sounds/notification.wav');
  notificationAudio.currentTime = 0;
  notificationAudio.play().catch(() => {
    // Autoplay can be blocked before the user has interacted with the page —
    // non-critical, the toast/badge already carry the notification.
  });
}

/**
 * Single source of truth for "a notification arrived": updates the shared
 * React Query cache the bell reads from, plays a sound (unless muted), and
 * queues an in-app toast. Mount once near the app root — NotificationBell no
 * longer listens for this itself, since it's only mounted while its dropdown
 * trigger is on-screen.
 */
export function useNotificationsSocket() {
  const queryClient = useQueryClient();
  const notificationsMuted = usePanelPrefsStore((s) => s.prefs.notificationsMuted);
  const pushToast = useNotificationToastStore((s) => s.push);

  useEffect(() => {
    const socket = getTeamChatSocket();
    if (!socket) return;

    const onNotification = (notification: AppNotification) => {
      queryClient.setQueryData<AppNotification[]>(['notifications'], (current) =>
        current ? [notification, ...current] : [notification]
      );
      if (!notificationsMuted) playNotificationSound();
      pushToast(notification);
    };

    socket.on('notification:new', onNotification);
    return () => {
      socket.off('notification:new', onNotification);
    };
  }, [queryClient, notificationsMuted, pushToast]);
}
