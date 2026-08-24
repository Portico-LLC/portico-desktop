import { Camera, Mic, ScreenShare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import type { CaptureMode } from '@/lib/recorder/types';

interface PermissionPrimerDialogProps {
  open: boolean;
  mode: CaptureMode;
  micEnabled: boolean;
  overlayClassName?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function PermissionPrimerDialog({
  open,
  mode,
  micEnabled,
  overlayClassName,
  onCancel,
  onConfirm,
}: PermissionPrimerDialogProps) {
  const items: { icon: typeof ScreenShare; label: string }[] = [];
  if (mode !== 'camera') items.push({ icon: ScreenShare, label: 'Pick the screen, window, or tab to record' });
  if (mode !== 'screen') items.push({ icon: Camera, label: 'Use your camera' });
  if (micEnabled) items.push({ icon: Mic, label: 'Use your microphone' });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="max-w-sm" overlayClassName={overlayClassName}>
        <DialogHeader>
          <DialogTitle>Portico needs a few permissions</DialogTitle>
          <DialogDescription>
            You'll be asked to approve the following before recording starts.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2.5">
          {items.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm text-ink-700">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm bg-pine-50 text-pine-700">
                <Icon size={16} />
              </span>
              {label}
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={onConfirm}>
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
