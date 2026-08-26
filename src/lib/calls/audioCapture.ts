import { mapMediaError } from '@/lib/recorder/permissions';

const CANDIDATE_AUDIO_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm'];

function pickAudioMimeType(): string {
  for (const candidate of CANDIDATE_AUDIO_MIME_TYPES) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return 'audio/webm';
}

export interface CallRecordingResult {
  mic: Blob | null;
  system: Blob | null;
  mimeType: string;
}

export interface AudioCaptureHandle {
  /** Stops both recorders and resolves with whatever was captured. Idempotent. */
  stop: () => Promise<CallRecordingResult>;
}

interface StartAudioCaptureOptions {
  onDebug?: (step: string) => void;
  /** Fired if the system-audio share ends unexpectedly (native "Stop sharing" control, OS revoke). */
  onInterrupted?: () => void;
  micDeviceId?: string;
}

interface TrackRecording {
  recorder: MediaRecorder;
  chunks: Blob[];
  mimeType: string;
}

function startTrackRecorder(stream: MediaStream, mimeType: string): TrackRecording {
  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, { mimeType });
  recorder.ondataavailable = (evt) => {
    if (evt.data.size) chunks.push(evt.data);
  };
  recorder.start(1000);
  return { recorder, chunks, mimeType };
}

function stopTrackRecorder(rec: TrackRecording): Promise<Blob> {
  return new Promise((resolve) => {
    if (rec.recorder.state === 'inactive') {
      resolve(new Blob(rec.chunks, { type: rec.mimeType }));
      return;
    }
    rec.recorder.onstop = () => resolve(new Blob(rec.chunks, { type: rec.mimeType }));
    rec.recorder.stop();
  });
}

/**
 * Records the employee's mic and the call's system/desktop audio as two
 * SEPARATE recordings (never mixed) so mic = employee, system = the other
 * party can be labeled deterministically once the call ends — no live
 * streaming, no realtime API, just two local recordings uploaded for batch
 * transcription after the call (see store/activeCall.ts).
 */
export async function startAudioCapture(opts: StartAudioCaptureOptions = {}): Promise<AudioCaptureHandle> {
  const debug = (step: string) => opts.onDebug?.(step);
  const mimeType = pickAudioMimeType();

  debug('audio: requesting getUserMedia (mic)…');
  let micStream: MediaStream;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: opts.micDeviceId ? { exact: opts.micDeviceId } : undefined,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
  } catch (err) {
    debug(`audio: getUserMedia failed — ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`);
    throw new Error(mapMediaError(err));
  }
  debug('audio: getUserMedia resolved, requesting getDisplayMedia (system)…');

  let displayStream: MediaStream;
  try {
    // getDisplayMedia requires requesting video for Electron's source-picker
    // flow to resolve system audio (see main.cjs's setupDisplayMediaHandler,
    // which returns { audio: 'loopback' } only for a video+audio request) —
    // the video track is discarded immediately, only the audio is kept.
    displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  } catch (err) {
    micStream.getTracks().forEach((t) => t.stop());
    debug(`audio: getDisplayMedia failed — ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`);
    throw new Error(mapMediaError(err));
  }
  debug('audio: getDisplayMedia resolved');
  displayStream.getVideoTracks().forEach((t) => t.stop());
  const systemAudioTrack = displayStream.getAudioTracks()[0];
  if (!systemAudioTrack) {
    micStream.getTracks().forEach((t) => t.stop());
    throw new Error('No system audio track was shared — enable "Share audio" and try again.');
  }
  const systemStream = new MediaStream([systemAudioTrack]);

  debug('audio: starting mic + system recorders…');
  const micRec = startTrackRecorder(micStream, mimeType);
  const systemRec = startTrackRecorder(systemStream, mimeType);
  debug('audio: both recorders started');

  let stopped = false;
  const stop = async (): Promise<CallRecordingResult> => {
    if (stopped) return { mic: null, system: null, mimeType };
    stopped = true;
    const [mic, system] = await Promise.all([stopTrackRecorder(micRec), stopTrackRecorder(systemRec)]);
    micStream.getTracks().forEach((t) => t.stop());
    systemStream.getTracks().forEach((t) => t.stop());
    return { mic, system, mimeType };
  };

  // The browser/OS "Stop sharing" control ends the track directly — the call
  // should end (and upload whatever was captured) exactly as if the user had
  // clicked "End", not just silently stop recording with the audio discarded.
  systemAudioTrack.addEventListener('ended', () => {
    debug('audio: system track ended (Stop sharing clicked, or OS/browser revoked it)');
    opts.onInterrupted?.();
  });

  return { stop };
}
