import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

function readToken(): string | null {
  return localStorage.getItem('portico_token') || sessionStorage.getItem('portico_token');
}

function clearAuthStorage() {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem('portico_token');
    storage.removeItem('portico_user');
    storage.removeItem('portico_role');
  }
}

api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function isPanelWindow(): boolean {
  const isElectron = typeof window !== 'undefined' && !!(window as any).__ELECTRON__?.isElectron;
  return isElectron && window.location.hash.startsWith('#/panel');
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthRoute = error.config?.url?.includes('/auth/');
      if (!isAuthRoute) {
        clearAuthStorage();
        // The panel window has no login form of its own (no route to redirect
        // to) — clearing storage is enough; Panel.tsx's own auth check picks up
        // the change and swaps to its signed-out empty state.
        if (isPanelWindow()) {
          return Promise.reject(error);
        }
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(data?.message)) return data!.message![0];
    return data?.message || error.message || 'Something went wrong';
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}

export function cleanPayload<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value === '') continue;
    if (typeof value === 'number' && Number.isNaN(value)) continue;
    cleaned[key] = value;
  }
  return cleaned as Partial<T>;
}
