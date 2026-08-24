import { API_URL } from '@/lib/api';

/**
 * Opens the Google Calendar connect flow as a popup, mirroring googleAuth.ts's
 * architecture: the backend does the whole OAuth handshake and posts the
 * result back via window.postMessage, then closes itself.
 */
export function openGoogleCalendarConnectPopup(userId: string): Promise<{ googleAccountEmail: string }> {
  return new Promise((resolve, reject) => {
    const nonce = crypto.randomUUID();
    const params = new URLSearchParams({ nonce, userId });

    const width = 480;
    const height = 640;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

    const popup = window.open(
      `${API_URL}/integrations/google-calendar/connect?${params.toString()}`,
      'portico-google-calendar-connect',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      reject(new Error('Your browser blocked the popup. Please allow popups for this site and try again.'));
      return;
    }

    let settled = false;

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      window.clearInterval(pollClosed);
    };

    function onMessage(event: MessageEvent) {
      const data = event.data as { nonce?: string; error?: string; connected?: boolean; googleAccountEmail?: string } | null;
      if (!data || typeof data !== 'object' || data.nonce !== nonce) return;

      settled = true;
      cleanup();
      if (data.error) {
        reject(new Error(data.error));
      } else if (data.connected && data.googleAccountEmail) {
        resolve({ googleAccountEmail: data.googleAccountEmail });
      } else {
        reject(new Error('Connection did not complete.'));
      }
    }

    window.addEventListener('message', onMessage);

    const pollClosed = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        if (!settled) reject(new Error('Connection was cancelled.'));
      }
    }, 500);
  });
}
