import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Presigned URLs expire after 15 minutes on the server.
 *
 * The documents viewer can ignore that because it is a modal that gets closed; a chat thread
 * sits open for hours, so an image fetched on load would 403 the moment the user scrolled
 * back to it. Refetching comfortably inside the window keeps every rendered attachment live.
 */
const URL_TTL_MS = 15 * 60 * 1000;
const REFRESH_MS = 10 * 60 * 1000;

export function useAttachmentUrl(apiBase: string, attachmentId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['chat-attachment-url', apiBase, attachmentId],
    queryFn: () =>
      api.get<{ url: string }>(`${apiBase}/attachments/${attachmentId}/view-url`).then((res) => res.data.url),
    enabled: !!attachmentId && enabled,
    staleTime: REFRESH_MS,
    gcTime: URL_TTL_MS,
    refetchInterval: REFRESH_MS,
    // The tab being in the background is exactly when a URL quietly goes stale.
    refetchIntervalInBackground: false,
    retry: 1,
  });
}

/** One-shot download link. Deliberately not cached — it is minted, used, and discarded. */
export async function fetchDownloadUrl(apiBase: string, attachmentId: string): Promise<string> {
  const { data } = await api.get<{ url: string }>(`${apiBase}/attachments/${attachmentId}/download-url`);
  return data.url;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}
