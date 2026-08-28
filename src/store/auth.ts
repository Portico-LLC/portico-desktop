import { create } from 'zustand';
import { api } from '@/lib/api';
import type { User, AuthResponse } from '@/lib/types';
import { useVaultStore } from '@/store/vault';

export type AuthRole = 'user' | 'client' | 'employee';

interface AuthState {
  user: User | null;
  token: string | null;
  role: AuthRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  clientLogin: (email: string, password: string, remember?: boolean) => Promise<void>;
  employeeLogin: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    company?: string;
  }) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
  updateProfile: (updates: { firstName?: string; lastName?: string; company?: string; phone?: string }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  completeAuth: (data: AuthResponse, remember?: boolean) => void;
}

function persist(token: string, user: User, remember = true) {
  const storage = remember ? window.localStorage : window.sessionStorage;
  storage.setItem('portico_token', token);
  storage.setItem('portico_user', JSON.stringify(user));
  const role: AuthRole = user.role === 'client' ? 'client' : user.role === 'employee' ? 'employee' : 'user';
  storage.setItem('portico_role', role);
  return role;
}

function readStored(): { token: string; user: User | null; role: AuthRole } | null {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const token = storage.getItem('portico_token');
    if (token) {
      let user: User | null = null;
      try {
        const raw = storage.getItem('portico_user');
        user = raw ? (JSON.parse(raw) as User) : null;
      } catch {
        user = null;
      }
      const role = (storage.getItem('portico_role') as AuthRole | null) ||
        (user?.role === 'client' ? 'client' : user?.role === 'employee' ? 'employee' : 'user');
      return { token, user, role };
    }
  }
  return null;
}

function clearStorage() {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    storage.removeItem('portico_token');
    storage.removeItem('portico_user');
    storage.removeItem('portico_role');
  }
}

function updateStoredUser(user: User) {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    if (storage.getItem('portico_token')) {
      storage.setItem('portico_user', JSON.stringify(user));
    }
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  role: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email, password, remember = true) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
      const role = persist(data.accessToken, data.user, remember);
      set({ user: data.user, token: data.accessToken, role, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  clientLogin: async (email, password, remember = true) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post<AuthResponse>('/auth/client-login', { email, password });
      const role = persist(data.accessToken, data.user, remember);
      set({ user: data.user, token: data.accessToken, role, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  employeeLogin: async (email, password, remember = true) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post<AuthResponse>('/auth/employee-login', { email, password });
      const role = persist(data.accessToken, data.user, remember);
      set({ user: data.user, token: data.accessToken, role, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  // Registering no longer logs the requester in — the account starts
  // 'pending' until a super admin approves it (see UserService.register on
  // the backend). This resolves once the request is submitted; the caller
  // shows a "request submitted" state rather than navigating anywhere.
  register: async (payload) => {
    set({ isLoading: true });
    try {
      await api.post('/auth/register', payload);
    } finally {
      set({ isLoading: false });
    }
  },

  completeAuth: (data, remember = true) => {
    const role = persist(data.accessToken, data.user, remember);
    set({ user: data.user, token: data.accessToken, role, isAuthenticated: true });
  },

  logout: () => {
    clearStorage();
    useVaultStore.getState().lock();
    // No-op outside Electron — the floating panel shares this localStorage-backed
    // session but only re-checks auth on its own focus event, so without this it
    // can keep showing stale authenticated UI indefinitely after logout.
    window.portico?.panel.hide();
    set({ user: null, token: null, role: null, isAuthenticated: false });
  },

  hydrate: () => {
    const stored = readStored();
    if (stored) {
      set({
        token: stored.token,
        user: stored.user,
        role: stored.role,
        isAuthenticated: !!stored.user,
      });
    }
  },

  updateProfile: async (updates) => {
    const { data } = await api.patch<User>('/auth/profile', updates);
    updateStoredUser(data);
    set({ user: data });
  },

  uploadAvatar: async (file) => {
    const form = new FormData();
    form.append('avatar', file);
    const endpoint = get().role === 'employee' ? '/employee/profile/avatar' : '/auth/profile/avatar';
    const { data } = await api.post<User>(endpoint, form, {
      headers: { 'Content-Type': undefined },
    });
    updateStoredUser(data);
    set({ user: data });
  },
}));
