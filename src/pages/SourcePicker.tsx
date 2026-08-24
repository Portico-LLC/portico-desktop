import { useEffect, useState } from 'react';
import { Monitor, ScreenShare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { DesktopCaptureSource } from '@/types/electron';

// Desktop-only route, rendered inside its own small Electron BrowserWindow
// (see electron/main.cjs createSourcePickerWindow) to stand in for the native
// "choose what to share" dialog a browser provides for free. Resolves the
// pending getDisplayMedia() call in the main process via IPC.
export function SourcePicker() {
  const [sources, setSources] = useState<DesktopCaptureSource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.portico?.recorder.getSources().then((list) => {
      setSources(list);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') window.portico?.recorder.cancelSource();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-bone-50 p-4">
      <h1 className="mb-3 flex items-center gap-2 text-base font-display font-medium text-ink-900">
        <ScreenShare size={18} className="text-pine-700" />
        Choose what to share
      </h1>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="py-12 text-center text-sm text-ink-400">Loading screens and windows…</p>
        ) : sources.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-400">Nothing available to share.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {sources.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => setSelectedId(source.id)}
                onDoubleClick={() => window.portico?.recorder.chooseSource(source.id)}
                className={cn(
                  'flex flex-col overflow-hidden rounded-md border-2 text-left transition-colors duration-hover ease-brand',
                  selectedId === source.id ? 'border-pine-700' : 'border-ink-200 hover:border-ink-300',
                )}
              >
                <div className="flex aspect-video items-center justify-center bg-ink-100">
                  {source.thumbnailDataUrl ? (
                    <img src={source.thumbnailDataUrl} alt={source.name} className="h-full w-full object-cover" />
                  ) : (
                    <Monitor size={24} className="text-ink-300" />
                  )}
                </div>
                <p className="truncate px-2 py-1.5 text-xs text-ink-700">{source.name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex justify-end gap-2 border-t border-ink-100 pt-3">
        <Button type="button" variant="secondary" size="sm" onClick={() => window.portico?.recorder.cancelSource()}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!selectedId}
          onClick={() => selectedId && window.portico?.recorder.chooseSource(selectedId)}
        >
          Share
        </Button>
      </div>
    </div>
  );
}
