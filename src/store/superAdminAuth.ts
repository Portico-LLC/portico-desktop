import { create } from 'zustand';
import { api } from '@/lib/api';

export interface SuperAdminUser {
  id: string;
  email: string;
  name?: string;
}

interface SuperAdminAuthResponse {
  user: SuperAdminUser;
  accessToken: string;
}

interface SuperAdminAuthState {
  user: SuperAdminUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

const STORAGE_TOKEN_KEY = 'portico_super_admin_token';
const STORAGE_USER_KEY = 'portico_super_admin_user';

export const useSuperAdminAuthStore = create<SuperAdminAuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post<SuperAdminAuthResponse>('/auth/super-admin-login', { email, password });
      window.localStorage.setItem(STORAGE_TOKEN_KEY, data.accessToken);
      window.localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
      set({ user: data.user, token: data.accessToken, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    window.localStorage.removeItem(STORAGE_TOKEN_KEY);
    window.localStorage.removeItem(STORAGE_USER_KEY);
    set({ user: null, token: null, isAuthenticated: false });
  },

  hydrate: () => {
    const token = window.localStorage.getItem(STORAGE_TOKEN_KEY);
    if (!token) return;
    let user: SuperAdminUser | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_USER_KEY);
      user = raw ? (JSON.parse(raw) as SuperAdminUser) : null;
    } catch {
      user = null;
    }
    set({ token, user, isAuthenticated: !!user });
  },
}));
