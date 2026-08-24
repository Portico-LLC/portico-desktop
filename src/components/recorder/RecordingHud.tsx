import { useState } from 'react';
import { Camera, CameraOff, ChevronDown, Mic, MicOff, Minimize2, Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { isElectron } from '@/lib/isElectron';
import { CameraPositioner } from './CameraPositioner';
import type { RecordingEngine } from '@/lib/recorder/useRecordingEngine';
import type { CameraPosition, CameraShape, CaptureMode } from '@/lib/recorder/types';

interface RecordingHudProps {
  engine: RecordingEngine;
  mode: CaptureMode;
  micEnabled: boolean;
  initialCameraShape: CameraShape;
  initialCameraPosition: CameraPosition;
  variant?: 'overlay' | 'inline';
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function RecordingHud({
  engine,
  mode,
  micEnabled,
  initialCameraShape,
  initialCameraPosition,
  variant = 'overlay',
}: RecordingHudProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [adjustingCamera, setAdjustingCamera] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [cameraShape, setCameraShape] = useState<CameraShape>(initialCameraShape);
  const [cameraPosition, setCameraPosition] = useState<CameraPosition>(initialCameraPosition);

  const isPaused = engine.state === 'paused';
  const showCameraControls = mode === 'screen-camera';

  const toggleMic = () => {
    const next = !micMuted;
    setMicMuted(next);
    engine.setMicMuted(next);
  };

  const toggleCamera = () => {
    const next = !cameraOn;
    setCameraOn(next);
    engine.setCameraEnabled(next);
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full border border-terracotta-500 bg-bone-50 shadow-md',
          variant === 'overlay' && 'fixed bottom-6 right-6 z-50',
        )}
        title="Show recording controls"
      >
        <span className="h-2.5 w-2.5 animate-pulse-subtle rounded-full bg-terracotta-500" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        'w-72 rounded-lg border border-ink-200 bg-bone-50 p-3 shadow-lg',
        variant === 'overlay' && 'fixed bottom-6 right-6 z-50',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-2.5 w-2.5 rounded-full bg-terracotta-500',
              !isPaused && 'animate-pulse-subtle',
            )}
          />
          <span className="font-mono text-sm text-ink-900">{formatTime(engine.elapsedSeconds)}</span>
          {isPaused && <span className="text-xs text-ink-400">Paused</span>}
        </div>
        {variant === 'overlay' && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="text-ink-400 hover:text-ink-700"
            title="Minimize"
          >
            <Minimize2 size={14} />
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button type="button" variant="secondary" size="icon" onClick={isPaused ? engine.resume : engine.pause}>
          {isPaused ? <Play size={16} /> : <Pause size={16} />}
        </Button>
        <Button type="button" variant="destructive" size="icon" onClick={engine.stop}>
          <Square size={14} />
        </Button>
        {micEnabled && (
          <Button type="button" variant="secondary" size="icon" onClick={toggleMic} title={micMuted ? 'Unmute mic' : 'Mute mic'}>
            {micMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </Button>
        )}
        {showCameraControls && (
          <Button type="button" variant="secondary" size="icon" onClick={toggleCamera} title={cameraOn ? 'Turn camera off' : 'Turn camera on'}>
            {cameraOn ? <Camera size={16} /> : <CameraOff size={16} />}
          </Button>
        )}
        {showCameraControls && cameraOn && (
          <button
            type="button"
            onClick={() => setAdjustingCamera((v) => !v)}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-sm text-ink-500 hover:bg-ink-100"
            title="Adjust camera position"
          >
            <ChevronDown size={16} className={cn('transition-transform', adjustingCamera && 'rotate-180')} />
          </button>
        )}
      </div>

      {!isElectron && variant === 'overlay' && (
        <p className="mt-2 text-[11px] text-ink-400">
          Recording "Entire Screen"? This panel may appear in the video — drag it out of the way or minimize it.
        </p>
      )}

      {showCameraControls && cameraOn && adjustingCamera && (
        <div className="mt-3 border-t border-ink-100 pt-3">
          <CameraPositioner
            shape={cameraShape}
            position={cameraPosition}
            onShapeChange={(shape) => {
              setCameraShape(shape);
              engine.setCameraShape(shape);
            }}
            onPositionChange={(pos) => {
              setCameraPosition(pos);
              engine.setCameraPosition(pos);
            }}
          />
        </div>
      )}
    </div>
  );
}
