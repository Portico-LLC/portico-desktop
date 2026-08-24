export type CaptureMode = 'screen' | 'screen-camera' | 'camera';
export type CameraShape = 'rect' | 'square' | 'circle';

export interface CameraPosition {
  // Fraction (0-1) of the available drag range — 0 is the canvas's left/top
  // edge, 1 is the right/bottom edge (i.e. already accounts for bubble size).
  xPct: number;
  yPct: number;
}

export interface StartRecordingOptions {
  mode: CaptureMode;
  micEnabled: boolean;
  micDeviceId?: string;
  systemAudioEnabled: boolean;
  cameraDeviceId?: string;
  cameraShape: CameraShape;
  cameraPosition: CameraPosition;
}

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
}

export type RecordingEngineState =
  | 'idle'
  | 'starting'
  | 'recording'
  | 'paused'
  | 'stopped'
  | 'error';

export const DEFAULT_CAMERA_POSITION: CameraPosition = { xPct: 1, yPct: 1 };
