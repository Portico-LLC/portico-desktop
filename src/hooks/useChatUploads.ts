import { useCallback, useRef, useState } from 'react';
import axios from 'axios';
import { api, getErrorMessage } from '@/lib/api';
import type { ChatAttachmentType } from '@/lib/types';

/** Mirrors the server's per-file cap so an oversized file fails instantly instead of after
 *  uploading. Keep the two in step. */
export const MAX_CHAT_ATTACHMENT_BYTES = 100 * 1024 * 1024;

export interface PendingUpload {
  localId: string;
  attachmentId: string | null;
  filename: string;
  mimeType: string;
  fileType: ChatAttachmentType;
  sizeBytes: number;
  progress: number;
  done: boolean;
  error?: string;
  /** Object URL for an instant local thumbnail — revoked when the upload is cleared. */
  previewUrl?: string;
}

function deriveFileType(mimeType: string): ChatAttachmentType {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'other';
}

/** Intrinsic dimensions and duration, read locally so the thread can reserve the right
 *  aspect ratio before the file has finished uploading. */
async function probeMedia(file: File): Promise<{ width?: number; height?: number; durationSeconds?: number }> {
  const type = deriveFileType(file.type);
  if (type !== 'image' && type !== 'video') return {};
  const url = URL.createObjectURL(file);
  try {
    if (type === 'image') {
      return await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve({});
        img.src = url;
      });
    }
    return await new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () =>
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          durationSeconds: Number.isFinite(video.duration) ? Math.round(video.duration) : undefined,
        });
      video.onerror = () => resolve({});
      video.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * The three-step presigned upload, generalised from the documents dropzone: ask the API for
 * a URL, PUT straight to storage, then confirm so the server can verify the object landed.
 *
 * Uploads start the moment a file is dropped rather than on send, so a large clip is already
 * in flight while the user is still typing. The message claims the finished rows by id.
 */
export function useChatUploads(apiBase: string, channelId: string | null) {
  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const abortControllers = useRef(new Map<string, AbortController>());

  const patch = useCallback((localId: string, changes: Partial<PendingUpload>) => {
    setUploads((prev) => prev.map((u) => (u.localId === localId ? { ...u, ...changes } : u)));
  }, []);

  const upload = useCallback(
    async (file: File) => {
      if (!channelId) return;
      const localId = `${file.name}-${Date.now()}-${Math.random()}`;
      const mimeType = file.type || 'application/octet-stream';
      const fileType = deriveFileType(mimeType);
      const previewUrl = fileType === 'image' ? URL.createObjectURL(file) : undefined;

      setUploads((prev) => [
        ...prev,
        {
          localId,
          attachmentId: null,
          filename: file.name,
          mimeType,
          fileType,
          sizeBytes: file.size,
          progress: 0,
          done: false,
          previewUrl,
        },
      ]);

      if (file.size === 0) {
        patch(localId, { error: 'That file is empty' });
        return;
      }
      if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
        patch(localId, {
          error: `Files here are limited to ${MAX_CHAT_ATTACHMENT_BYTES / (1024 * 1024)}MB — use Documents for anything larger`,
        });
        return;
      }

      try {
        const probe = await probeMedia(file);
        const { data } = await api.post<{ attachmentId: string; uploadUrl: string }>(
          `${apiBase}/channels/${channelId}/attachments`,
          { filename: file.name, mimeType, sizeBytes: file.size, ...probe },
        );
        patch(localId, { attachmentId: data.attachmentId });

        const controller = new AbortController();
        abortControllers.current.set(localId, controller);

        // Presigned URLs must not carry this app's Bearer token — use a bare axios call.
        await axios.put(data.uploadUrl, file, {
          headers: { 'Content-Type': mimeType },
          signal: controller.signal,
          onUploadProgress: (evt) => {
            const progress = evt.total ? Math.round((evt.loaded / evt.total) * 100) : 0;
            patch(localId, { progress });
          },
        });

        await api.post(`${apiBase}/attachments/${data.attachmentId}/confirm`);
        patch(localId, { progress: 100, done: true });
      } catch (err) {
        if (axios.isCancel(err)) return;
        patch(localId, { error: getErrorMessage(err) });
      } finally {
        abortControllers.current.delete(localId);
      }
    },
    [apiBase, channelId, patch],
  );

  const addFiles = useCallback((files: File[]) => files.forEach((file) => void upload(file)), [upload]);

  /** Cancels an in-flight upload and tells the server to drop the row it reserved. */
  const remove = useCallback(
    async (localId: string) => {
      const target = uploads.find((u) => u.localId === localId);
      abortControllers.current.get(localId)?.abort();
      abortControllers.current.delete(localId);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      setUploads((prev) => prev.filter((u) => u.localId !== localId));
      if (target?.attachmentId) {
        await api.delete(`${apiBase}/attachments/${target.attachmentId}`).catch(() => undefined);
      }
    },
    [apiBase, uploads],
  );

  /** Called after a successful send — the rows now belong to a message. */
  const clear = useCallback(() => {
    setUploads((prev) => {
      prev.forEach((u) => u.previewUrl && URL.revokeObjectURL(u.previewUrl));
      return [];
    });
    abortControllers.current.clear();
  }, []);

  const readyIds = uploads.filter((u) => u.done && u.attachmentId).map((u) => u.attachmentId!);
  const isUploading = uploads.some((u) => !u.done && !u.error);

  return { uploads, addFiles, remove, clear, readyIds, isUploading };
}
