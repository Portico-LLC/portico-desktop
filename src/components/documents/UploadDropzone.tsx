import { useCallback, useState } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { UploadCloud, X, AlertCircle } from 'lucide-react';

interface UploadDropzoneProps {
  projectId?: string;
  tags?: string[];
  onDone?: () => void;
}

interface UploadItem {
  id: string;
  name: string;
  progress: number;
  error?: string;
  done: boolean;
}

export function UploadDropzone({ projectId, tags, onDone }: UploadDropzoneProps) {
  const queryClient = useQueryClient();
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  const uploadOne = useCallback(
    async (file: File) => {
      const localId = `${file.name}-${Date.now()}-${Math.random()}`;
      setUploads((prev) => [...prev, { id: localId, name: file.name, progress: 0, done: false }]);

      try {
        const { data } = await api.post<{ documentId: string; uploadUrl: string }>('/documents/upload-url', {
          projectId,
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          tags,
        });

        // Presigned URLs must not carry this app's Bearer token — use a bare axios call.
        await axios.put(data.uploadUrl, file, {
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          onUploadProgress: (evt) => {
            const progress = evt.total ? Math.round((evt.loaded / evt.total) * 100) : 0;
            setUploads((prev) => prev.map((u) => (u.id === localId ? { ...u, progress } : u)));
          },
        });

        await api.post(`/documents/${data.documentId}/confirm`);

        setUploads((prev) => prev.map((u) => (u.id === localId ? { ...u, progress: 100, done: true } : u)));
        queryClient.invalidateQueries({ queryKey: ['documents'] });
        queryClient.invalidateQueries({ queryKey: ['documents-quota'] });
        onDone?.();
        setTimeout(() => setUploads((prev) => prev.filter((u) => u.id !== localId)), 1500);
      } catch (err) {
        setUploads((prev) => prev.map((u) => (u.id === localId ? { ...u, error: getErrorMessage(err) } : u)));
      }
    },
    [projectId, tags, queryClient, onDone],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => uploadOne(file));
    },
    [uploadOne],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-ink-300 bg-bone-50/50 px-6 py-10 text-center transition-colors',
          isDragActive && 'border-brass-500 bg-brass-50',
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="h-8 w-8 text-ink-400" />
        <p className="text-sm text-ink-600">
          {isDragActive ? 'Drop files to upload' : 'Drag and drop files here, or click to browse'}
        </p>
        <p className="text-xs text-ink-400">Images, videos, PDFs, and other files</p>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((u) => (
            <div key={u.id} className="rounded-sm border border-ink-200 bg-bone-50 px-3 py-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-ink-700">{u.name}</span>
                {u.error ? (
                  <button onClick={() => setUploads((prev) => prev.filter((x) => x.id !== u.id))} className="text-ink-400 hover:text-ink-700">
                    <X size={14} />
                  </button>
                ) : (
                  <span className="text-ink-400">{u.done ? 'Done' : `${u.progress}%`}</span>
                )}
              </div>
              {u.error ? (
                <p className="mt-1 flex items-center gap-1 text-xs text-terracotta-600">
                  <AlertCircle size={12} />
                  {u.error}
                </p>
              ) : (
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-ink-200">
                  <div className="h-full rounded-full bg-pine-700 transition-all" style={{ width: `${u.progress}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
