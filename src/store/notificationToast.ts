import { create } from 'zustand';
import type { AppNotification } from '@/lib/types';

const AUTO_DISMISS_MS = 5000;

export interface NotificationToastEntry {
  id: string;
  notification: AppNotification;
}

interface NotificationToastState {
  toasts: NotificationToastEntry[];
  push: (notification: AppNotification) => void;
  dismiss: (id: string) => void;
}

export const useNotificationToastStore = create<NotificationToastState>((set, get) => ({
  toasts: [],

  push: (notification) => {
    const id = `${notification.id}-${Date.now()}`;
    set((state) => ({ toasts: [...state.toasts, { id, notification }] }));
    setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS);
  },

  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
