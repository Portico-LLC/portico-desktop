import { useEffect, useState } from 'react';
import { Camera, Monitor, ScreenShare, Video } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/utils';
import { isElectron } from '@/lib/isElectron';
import { CameraPositioner } from './CameraPositioner';
import type { CameraPosition, CameraShape, CaptureMode, StartRecordingOptions } from '@/lib/recorder/types';
import { DEFAULT_CAMERA_POSITION } from '@/lib/recorder/types';

interface RecordingSetupModalProps {
  open: boolean;
  error?: string | null;
  overlayClassName?: string;
  onClose: () => void;
  onContinue: (options: StartRecordingOptions) => void;
}

const MODE_OPTIONS: { id: CaptureMode; label: string; description: string; icon: typeof ScreenShare }[] = [
  { id: 'screen', label: 'Screen', description: 'Record your screen, a window, or a tab', icon: ScreenShare },
  { id: 'screen-camera', label: 'Screen + Camera', description: 'Screen recording with a camera overlay', icon: Monitor },
  { id: 'camera', label: 'Camera only', description: 'Just your camera, no screen', icon: Camera },
];

export function RecordingSetupModal({ open, error, overlayClassName, onClose, onContinue }: RecordingSetupModalProps) {
  const [mode, setMode] = useState<CaptureMode>('screen');
  const [micEnabled, setMicEnabled] = useState(true);
  const [micDeviceId, setMicDeviceId] = useState('');
  const [systemAudioEnabled, setSystemAudioEnabled] = useState(false);
  const [cameraDeviceId, setCameraDeviceId] = useState('');
  const [cameraShape, setCameraShape] = useState<CameraShape>('circle');
  const [cameraPosition, setCameraPosition] = useState<CameraPosition>(DEFAULT_CAMERA_POSITION);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    if (!open || typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setMics(devices.filter((d) => d.kind === 'audioinput'));
      setCameras(devices.filter((d) => d.kind === 'videoinput'));
    });
  }, [open]);

  const wantsCamera = mode !== 'screen';
  const wantsSystemAudio = mode !== 'camera';

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg" overlayClassName={overlayClassName}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video size={18} className="text-pine-700" />
            New recording
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {MODE_OPTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-center transition-colors duration-hover ease-brand',
                  mode === id
                    ? 'border-pine-700 bg-pine-50 text-pine-800'
                    : 'border-ink-200 text-ink-600 hover:bg-ink-50',
                )}
              >
                <Icon size={18} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>

          {mode !== 'camera' && isElectron && (
            <p className="rounded-sm bg-ink-100 px-3 py-2 text-xs text-ink-500">
              You'll choose which screen or window to share next.
            </p>
          )}
          {mode !== 'camera' && !isElectron && (
            <p className="rounded-sm bg-ink-100 px-3 py-2 text-xs text-ink-500">
              Your browser will let you choose a screen, window, or tab to share next.
            </p>
          )}

          {wantsCamera && (
            <div className="space-y-2">
              <Label>Camera</Label>
              <Select value={cameraDeviceId} onChange={(e) => setCameraDeviceId(e.target.value)}>
                <option value="">System default</option>
                {cameras.map((cam, i) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {cam.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </Select>
              {mode === 'screen-camera' && (
                <CameraPositioner
                  shape={cameraShape}
                  position={cameraPosition}
                  onShapeChange={setCameraShape}
                  onPositionChange={setCameraPosition}
                />
              )}
            </div>
          )}

          <div className="space-y-3 rounded-md border border-ink-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-900">Microphone</p>
                <p className="text-xs text-ink-400">Record narration alongside the video</p>
              </div>
              <Switch checked={micEnabled} onCheckedChange={setMicEnabled} />
            </div>
            {micEnabled && (
              <Select value={micDeviceId} onChange={(e) => setMicDeviceId(e.target.value)}>
                <option value="">System default</option>
                {mics.map((mic, i) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microphone ${i + 1}`}
                  </option>
                ))}
              </Select>
            )}

            {wantsSystemAudio && (
              <div className="flex items-center justify-between border-t border-ink-100 pt-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">System / tab audio</p>
                  <p className="text-xs text-ink-400">Capture sound playing on your screen</p>
                </div>
                <Switch checked={systemAudioEnabled} onCheckedChange={setSystemAudioEnabled} />
              </div>
            )}

            {!micEnabled && !systemAudioEnabled && (
              <p className="text-xs text-ink-400">This recording will be silent.</p>
            )}
          </div>

          {error && <p className="text-xs text-terracotta-600">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() =>
                onContinue({
                  mode,
                  micEnabled,
                  micDeviceId: micDeviceId || undefined,
                  systemAudioEnabled: wantsSystemAudio && systemAudioEnabled,
                  cameraDeviceId: cameraDeviceId || undefined,
                  cameraShape,
                  cameraPosition,
                })
              }
            >
              Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
