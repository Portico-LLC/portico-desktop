import { create } from 'zustand';

const AUTO_DISMISS_MS = 5000;

export type ActionToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ActionToastEntry {
  id: string;
  variant: ActionToastVariant;
  title: string;
  description?: string;
}

interface ActionToastState {
  toasts: ActionToastEntry[];
  push: (variant: ActionToastVariant, title: string, description?: string) => void;
  dismiss: (id: string) => void;
}

export const useActionToastStore = create<ActionToastState>((set, get) => ({
  toasts: [],

  push: (variant, title, description) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({ toasts: [...state.toasts, { id, variant, title, description }] }));
    setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS);
  },

  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

// Callable from anywhere (mutation handlers, plain event handlers) without a hook.
export const actionToast = {
  success: (title: string, description?: string) => useActionToastStore.getState().push('success', title, description),
  error: (title: string, description?: string) => useActionToastStore.getState().push('error', title, description),
  warning: (title: string, description?: string) => useActionToastStore.getState().push('warning', title, description),
  info: (title: string, description?: string) => useActionToastStore.getState().push('info', title, description),
};
