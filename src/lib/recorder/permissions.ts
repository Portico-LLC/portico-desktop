import type { CaptureMode } from './types';

export function describePermissionsNeeded(mode: CaptureMode, micEnabled: boolean): string[] {
  const items: string[] = [];
  if (mode !== 'camera') items.push('Screen or window capture');
  if (mode !== 'screen') items.push('Camera');
  if (micEnabled) items.push('Microphone');
  return items;
}

export function mapMediaError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : undefined;
  switch (name) {
    case 'NotAllowedError':
      return 'Access was denied. Allow screen, camera, and/or microphone access and try again.';
    case 'NotFoundError':
      return 'No matching camera or microphone was found on this device.';
    case 'NotReadableError':
      return 'The camera or microphone is already in use by another app.';
    default:
      return err instanceof Error ? err.message : 'Could not start the recording.';
  }
}
