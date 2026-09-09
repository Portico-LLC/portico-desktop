import { create } from 'zustand';
import { api } from '@/lib/api';
import { startAudioCapture, type AudioCaptureHandle } from '@/lib/calls/audioCapture';
import { useLiveTranscriptStore } from '@/store/liveTranscript';
import { useAuthStore } from '@/store/auth';
import type { Call } from '@/lib/types';

export type CallPanelStatus = 'idle' | 'connecting' | 'active' | 'ending' | 'error';

interface ActiveCallState {
  projectId: string | null;
  status: CallPanelStatus;
  error: string | null;
  elapsedSeconds: number;
  callId: string | null;
  audio: AudioCaptureHandle | null;
  timer: number | null;
  startCall: (projectId: string, clientId: string | undefined) => Promise<void>;
  endCall: () => Promise<void>;
}

function debugLog(step: string, detail?: unknown) {
  console.log('[call]', step, detail ?? '');
}

function extensionFor(mimeType: string): string {
  return mimeType.includes('webm') ? 'webm' : 'ogg';
}

function stopTimer(get: () => ActiveCallState) {
  const { timer } = get();
  if (timer !== null) window.clearInterval(timer);
}

/**
 * Owns the active call outside of React component state. CallPanel was
 * proven (real DevTools console capture) to unmount and remount repeatedly
 * mid-call for reasons unrelated to the call itself — every remount wiped
 * the component's useRef-held state, which was silently killing calls
 * before anything was captured. A Zustand store's state lives at module
 * scope, so it survives that churn; CallPanel just subscribes to it and
 * calls startCall/endCall.
 *
 * No live streaming, no socket, no realtime API — mic and system audio are
 * recorded locally for the call's duration and uploaded once it ends, for
 * batch transcription (see CallsService.endForCaller on the backend).
 */
export const useActiveCallStore = create<ActiveCallState>((set, get) => ({
  projectId: null,
  status: 'idle',
  error: null,
  elapsedSeconds: 0,
  callId: null,
  audio: null,
  timer: null,

  startCall: async (projectId, clientId) => {
    if (get().status === 'connecting' || get().status === 'active') return;
    set({ status: 'connecting', error: null, elapsedSeconds: 0, projectId });
    try {
      const { data: created } = await api.post<Call>('/calls', { projectId, clientId });
      set({ callId: created.id });
      await api.post(`/calls/${created.id}/start`);
      debugLog('/start acked, requesting mic + system audio…');

      const audio = await startAudioCapture({
        onDebug: debugLog,
        onInterrupted: () => {
          debugLog('audio interrupted (system share ended) — ending call');
          void get().endCall();
        },
      });
      set({ audio });
      debugLog('audio capture started');

      const startedAt = Date.now();
      const timer = window.setInterval(() => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })), 1000);
      set({ status: 'active', timer });

      // Strictly best-effort. The recorders above are already running and their
      // upload is what guarantees a transcript, so a missing Deepgram key, a
      // blocked socket or a failed worklet must never take the call down with it.
      try {
        const { data: capabilities } = await api.get<{ liveTranscription: boolean }>('/calls/capabilities');
        const token = useAuthStore.getState().token;
        if (capabilities.liveTranscription && token) {
          await useLiveTranscriptStore
            .getState()
            .begin(created.id, token, audio.streams, () => Date.now() - startedAt);
          debugLog('live transcription started');
        }
      } catch (err) {
        debugLog('live transcription unavailable — continuing with post-call transcription only', {
          message: err instanceof Error ? err.message : String(err),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      debugLog('startCall failed', { message });
      get().audio?.stop().catch(() => {});
      useLiveTranscriptStore.getState().reset();
      stopTimer(get);
      set({ error: message || 'Could not start the call.', status: 'error', audio: null, callId: null, timer: null });
    }
  },

  endCall: async () => {
    if (get().status === 'ending' || get().status === 'idle') return;
    set({ status: 'ending' });
    const { audio, callId } = get();
    stopTimer(get);
    // Flush and close the Deepgram sockets before the tracks stop, so the last
    // words spoken still come back as final results. The transcript itself stays
    // on screen after the call for the summary review.
    useLiveTranscriptStore.getState().finish();
    try {
      const recording = await audio?.stop();
      if (callId) {
        const form = new FormData();
        const ext = extensionFor(recording?.mimeType ?? 'audio/webm');
        if (recording?.mic) form.append('mic', recording.mic, `mic.${ext}`);
        if (recording?.system) form.append('system', recording.system, `system.${ext}`);
        await api.post(`/calls/${callId}/end`, form, { headers: { 'Content-Type': undefined } });
      }
    } catch (err) {
      debugLog('endCall upload failed', { message: err instanceof Error ? err.message : String(err) });
    }
    set({ status: 'idle', audio: null, callId: null, timer: null, elapsedSeconds: 0, projectId: null });
  },
}));

// App-level (not component-level) safety net: only truly tear down the
// mic/system tracks when the whole app is actually closing. Deliberately
// NOT a React effect — an effect tied to CallPanel's lifecycle is exactly
// what caused calls to die mid-start when the panel remounted.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const { audio, timer } = useActiveCallStore.getState();
    useLiveTranscriptStore.getState().reset();
    audio?.stop().catch(() => {});
    if (timer !== null) window.clearInterval(timer);
  });
}
