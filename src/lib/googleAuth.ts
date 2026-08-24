import { API_URL } from '@/lib/api';
import type { AuthResponse } from '@/lib/types';

export type GoogleAuthRole = 'owner' | 'employee' | 'client';

interface GoogleAuthOptions {
  role: GoogleAuthRole;
  inviteToken?: string;
}

/**
 * Opens Google sign-in as a popup pointed at the backend's own /auth/google
 * endpoint (never a client-side Google SDK). The backend does the whole OAuth
 * handshake and posts the resulting session back via window.postMessage, then
 * closes itself. This sidesteps Google Identity Services' requirement for an
 * http(s) "authorized JavaScript origin" — which the packaged Electron app's
 * file:// origin can never satisfy.
 */
export function openGooglePopup({ role, inviteToken }: GoogleAuthOptions): Promise<AuthResponse> {
  return new Promise((resolve, reject) => {
    const nonce = crypto.randomUUID();
    const params = new URLSearchParams({ role, nonce });
    if (inviteToken) params.set('inviteToken', inviteToken);

    const width = 480;
    const height = 640;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

    const popup = window.open(
      `${API_URL}/auth/google?${params.toString()}`,
      'portico-google-auth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      reject(new Error('Your browser blocked the sign-in popup. Please allow popups for this site and try again.'));
      return;
    }

    let settled = false;

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      window.clearInterval(pollClosed);
    };

    function onMessage(event: MessageEvent) {
      const data = event.data as { nonce?: string; error?: string; accessToken?: string; user?: AuthResponse['user'] } | null;
      if (!data || typeof data !== 'object' || data.nonce !== nonce) return;

      settled = true;
      cleanup();
      if (data.error) {
        reject(new Error(data.error));
      } else if (data.accessToken && data.user) {
        resolve({ accessToken: data.accessToken, user: data.user });
      } else {
        reject(new Error('Google sign-in did not return a valid session.'));
      }
    }

    window.addEventListener('message', onMessage);

    const pollClosed = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        if (!settled) reject(new Error('Sign-in was cancelled.'));
      }
    }, 500);
  });
}
