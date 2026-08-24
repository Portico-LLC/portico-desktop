import { Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RecorderController } from '@/components/recorder/RecorderController';

const PANEL_OVERLAY_CLASS = 'backdrop-blur-none bg-ink-950/60';

export function RecordTab() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pine-50 text-pine-700">
        <Video size={22} />
      </span>
      <div>
        <p className="text-sm font-medium text-ink-900">Record a quick video</p>
        <p className="text-xs text-ink-400">Screen, camera, or both — saved straight to Documents.</p>
      </div>
      <RecorderController
        dialogOverlayClassName={PANEL_OVERLAY_CLASS}
        renderTrigger={(open) => (
          <Button type="button" variant="primary" onClick={open}>
            <Video size={16} />
            Start recording
          </Button>
        )}
      />
    </div>
  );
}
