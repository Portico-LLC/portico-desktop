import { useCallback, useRef, useState } from 'react';
import { mapMediaError } from '@/lib/recorder/permissions';
import workletUrl from '@/lib/recorder/pcmDownsamplerWorklet.js?url';

export type CallTrack = 'mic' | 'system';
export type CallAudioState = 'idle' | 'starting' | 'active' | 'stopped' | 'error';

interface TrackRig {
  stream: MediaStream;
  context: AudioContext;
  node: AudioWorkletNode;
  muteGain: GainNode;
}

interface UseCallAudioStreamOptions {
  /** `pcm` is raw PCM16 bytes, 24kHz mono, little-endian — one ~200ms buffer. */
  onPcmChunk: (track: CallTrack, pcm: ArrayBuffer) => void;
  onError: (message: string) => void;
}

/**
 * Captures the employee's mic and the call's system/desktop audio as two
 * SEPARATE PCM streams (never mixed) — this is what lets the backend
 * transcribe them independently and attribute speech deterministically
 * (mic = employee, system = the other party) instead of guessing. See the
 * meeting-bot plan's corrections: this replaces the fake ML speaker
 * detector the original draft had.
 *
 * This is a sibling to useRecordingEngine.ts, not a fork of it — that hook
 * mixes mic + system audio together for file recording, which is exactly
 * the thing this hook must NOT do.
 */
export function useCallAudioStream({ onPcmChunk, onError }: UseCallAudioStreamOptions) {
  const [state, setState] = useState<CallAudioState>('idle');
  const micRigRef = useRef<TrackRig | null>(null);
  const systemRigRef = useRef<TrackRig | null>(null);

  const teardownRig = (rig: TrackRig | null) => {
    if (!rig) return;
    rig.node.port.onmessage = null;
    rig.node.disconnect();
    rig.muteGain.disconnect();
    rig.context.close().catch(() => {});
    rig.stream.getTracks().forEach((t) => t.stop());
  };

  const stop = useCallback(() => {
    teardownRig(micRigRef.current);
    teardownRig(systemRigRef.current);
    micRigRef.current = null;
    systemRigRef.current = null;
    setState((prev) => (prev === 'error' ? prev : 'stopped'));
  }, []);

  const setupTrack = useCallback(async (track: CallTrack, stream: MediaStream): Promise<TrackRig> => {
    const context = new AudioContext({ sampleRate: 24000 });
    await context.audioWorklet.addModule(workletUrl);
    const source = context.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(context, 'pcm-downsampler', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
      channelCountMode: 'explicit',
    });
    node.port.onmessage = (evt: MessageEvent<ArrayBuffer>) => onPcmChunk(track, evt.data);
    source.connect(node);
    // Route the (silent) worklet output to destination through a muted gain —
    // some Chromium builds stop scheduling process() on a node that never
    // reaches the destination, since it looks unreachable/prunable from the
    // render graph's perspective. This keeps the node "live" without making
    // any sound (gain 0), and doesn't touch what the user actually hears.
    const muteGain = context.createGain();
    muteGain.gain.value = 0;
    node.connect(muteGain).connect(context.destination);
    return { stream, context, node, muteGain };
  }, [onPcmChunk]);

  const start = useCallback(
    async (opts: { micDeviceId?: string } = {}) => {
      setState('starting');
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: opts.micDeviceId ? { exact: opts.micDeviceId } : undefined,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        // getDisplayMedia requires requesting video for Electron's source-picker
        // flow to resolve system audio (see main.cjs's setupDisplayMediaHandler,
        // which returns { audio: 'loopback' } only for a video+audio request) —
        // the video track is discarded immediately, only the audio is kept.
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        displayStream.getVideoTracks().forEach((t) => t.stop());
        const systemAudioTrack = displayStream.getAudioTracks()[0];
        if (!systemAudioTrack) {
          micStream.getTracks().forEach((t) => t.stop());
          throw new Error('No system audio track was shared — enable "Share audio" and try again.');
        }
        const systemStream = new MediaStream([systemAudioTrack]);
        // The browser/OS "Stop sharing" control ends the track directly — treat
        // that the same as the user ending the call.
        systemAudioTrack.addEventListener('ended', stop);

        micRigRef.current = await setupTrack('mic', micStream);
        systemRigRef.current = await setupTrack('system', systemStream);

        setState('active');
      } catch (err) {
        stop();
        onError(mapMediaError(err));
        setState('error');
      }
    },
    [onError, setupTrack, stop],
  );

  return { state, start, stop };
}
