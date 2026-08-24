import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import type { Project } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { TagEditor } from '@/components/documents/TagEditor';
import { AlertCircle } from 'lucide-react';
import type { RecordingResult } from '@/lib/recorder/types';

interface RecordingPreviewModalProps {
  open: boolean;
  result: RecordingResult | null;
  projects?: Project[];
  defaultProjectId?: string;
  overlayClassName?: string;
  onDiscard: () => void;
  onSaved: () => void;
}

export function RecordingPreviewModal({
  open,
  result,
  projects,
  defaultProjectId,
  overlayClassName,
  onDiscard,
  onSaved,
}: RecordingPreviewModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('Untitled recording');
  const [projectId, setProjectId] = useState(defaultProjectId ?? '');
  const [tags, setTags] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoUrl = useMemo(() => (result ? URL.createObjectURL(result.blob) : null), [result]);
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  useEffect(() => {
    if (open) {
      setTitle('Untitled recording');
      setProjectId(defaultProjectId ?? '');
      setTags([]);
      setProgress(null);
      setError(null);
    }
  }, [open, defaultProjectId]);

  if (!result) return null;

  const extension = result.mimeType.includes('webm') ? 'webm' : 'mp4';
  const durationLabel = `${Math.floor(result.durationSeconds / 60)}:${String(result.durationSeconds % 60).padStart(2, '0')}`;

  const save = async () => {
    setError(null);
    setProgress(0);
    try {
      const filename = `${title.trim() || 'Untitled recording'}.${extension}`;
      const file = new File([result.blob], filename, { type: result.mimeType });

      const { data } = await api.post<{ documentId: string; uploadUrl: string }>('/documents/upload-url', {
        projectId: projectId || undefined,
        filename,
        mimeType: file.type,
        sizeBytes: file.size,
        tags,
        fileType: 'recording',
        durationSeconds: result.durationSeconds,
      });

      await axios.put(data.uploadUrl, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (evt) => {
          setProgress(evt.total ? Math.round((evt.loaded / evt.total) * 100) : 0);
        },
      });

      await api.post(`/documents/${data.documentId}/confirm`);

      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents-quota'] });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
      setProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && progress === null && onDiscard()}>
      <DialogContent className="max-w-lg" overlayClassName={overlayClassName}>
        <DialogHeader>
          <DialogTitle>Save your recording</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {videoUrl && (
            <video src={videoUrl} controls className="max-h-64 w-full rounded-md bg-ink-950" />
          )}
          <p className="text-xs text-ink-400">Duration {durationLabel}</p>

          <div className="space-y-2">
            <Label htmlFor="recording-title">Title</Label>
            <Input id="recording-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {projects && (
            <div className="space-y-2">
              <Label htmlFor="recording-project">Project</Label>
              <Select id="recording-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Tags</Label>
            <TagEditor tags={tags} onChange={setTags} />
          </div>

          {error && (
            <p className="flex items-center gap-1 text-xs text-terracotta-600">
              <AlertCircle size={12} />
              {error}
            </p>
          )}

          {progress !== null && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
              <div className="h-full rounded-full bg-pine-700 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onDiscard} disabled={progress !== null}>
              Discard
            </Button>
            <Button type="button" variant="primary" onClick={save} disabled={progress !== null}>
              {progress !== null ? `Uploading… ${progress}%` : 'Save to Documents'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
