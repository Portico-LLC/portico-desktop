import { create } from 'zustand';
import type { Socket } from 'socket.io-client';
import { connectCallsSocket, disconnectCallsSocket } from '@/lib/calls/callsSocket';
import { DeepgramTrackStream, type CallTrack, type StreamState } from '@/lib/calls/deepgramStream';
import { startPcmTap, type PcmTap } from '@/lib/calls/pcmWorklet';

export interface Utterance {
  id: string;
  track: CallTrack;
  speakerKey: string;
  text: string;
  startMs: number;
  endMs: number;
  sequence: number;
  confidence?: number;
  /** Two remote people were talking over each other — the speaker attribution on
   *  this line is a guess, and the UI says so. */
  overlapped?: boolean;
}

/** A suggested reply to something the client just asked. Never persisted, never
 *  sent anywhere — it exists only in this store for as long as it's on screen. */
export interface CoachSuggestion {
  id: string;
  kind: 'question' | 'objection';
  headline: string;
  talkingPoints: string[];
  cautions: string[];
  createdAt: string;
}

export interface Speaker {
  speakerKey: string;
  displayName: string;
  colorIndex: number;
}

/** Only the last stretch is kept in the DOM — a long call produces thousands of
 *  lines and the panel only ever shows the tail. The full transcript is on the
 *  call record once it ends. */
const MAX_RENDERED_UTTERANCES = 400;

interface LiveTranscriptState {
  callId: string | null;
  utterances: Utterance[];
  speakers: Record<string, Speaker>;
  /** One in-flight partial per track, replaced as Deepgram revises it. */
  interim: Record<CallTrack, string>;
  streamState: Record<CallTrack, StreamState>;
  available: boolean;
  /** At most one at a time. A stack of stale advice in a 360px panel is unusable,
   *  so a new suggestion replaces the previous one. */
  suggestion: CoachSuggestion | null;
  dismissSuggestion: () => void;

  begin: (callId: string, token: string, streams: { mic: MediaStream; system: MediaStream | null }, elapsedMs: () => number) => Promise<void>;
  pushFrame: (track: CallTrack, frame: ArrayBuffer) => void;
  renameSpeaker: (speakerKey: string, displayName: string) => void;
  finish: () => void;
  reset: () => void;
}

interface Runtime {
  socket: Socket | null;
  streams: Partial<Record<CallTrack, DeepgramTrackStream>>;
  taps: PcmTap[];
}

// Module scope, deliberately — same reasoning as activeCall.ts: CallPanel remounts
// mid-call, and PanelShell's AnimatePresence mode="wait" unmounts the whole tab on
// every switch. Anything held in component state would be wiped mid-sentence.
const runtime: Runtime = { socket: null, streams: {}, taps: [] };

function speakerRecord(list: Speaker[]): Record<string, Speaker> {
  return Object.fromEntries(list.map((s) => [s.speakerKey, s]));
}

export const useLiveTranscriptStore = create<LiveTranscriptState>((set, get) => ({
  callId: null,
  utterances: [],
  speakers: {},
  interim: { mic: '', system: '' },
  streamState: { mic: 'stopped', system: 'stopped' },
  available: false,
  suggestion: null,

  dismissSuggestion: () => set({ suggestion: null }),

  begin: async (callId, token, streams, elapsedMs) => {
    set({
      callId,
      utterances: [],
      speakers: {},
      interim: { mic: '', system: '' },
      streamState: { mic: 'connecting', system: streams.system ? 'connecting' : 'stopped' },
      available: true,
    });

    const socket = connectCallsSocket(token);
    runtime.socket = socket;
    socket.emit('call:join', { callId });

    socket.on('call:backlog', (payload: { callId: string; utterances: Utterance[]; speakers: Speaker[] }) => {
      if (payload.callId !== get().callId) return;
      set({ utterances: payload.utterances.slice(-MAX_RENDERED_UTTERANCES), speakers: speakerRecord(payload.speakers) });
    });

    socket.on('call:utterance', (payload: { callId: string; utterance: Utterance; speakers: Speaker[] }) => {
      if (payload.callId !== get().callId) return;
      set((s) => ({
        utterances: [...s.utterances, payload.utterance].slice(-MAX_RENDERED_UTTERANCES),
        speakers: speakerRecord(payload.speakers),
      }));
    });

    socket.on('call:coach-suggestion', (payload: { callId: string; suggestion: CoachSuggestion }) => {
      if (payload.callId !== get().callId) return;
      set({ suggestion: payload.suggestion });
    });

    socket.on('call:speaker-updated', (payload: { callId: string; speaker: Speaker }) => {
      if (payload.callId !== get().callId) return;
      // Utterances carry speakerKey only, so renaming is purely a lookup change —
      // every line already on screen re-renders under the new name.
      set((s) => ({ speakers: { ...s.speakers, [payload.speaker.speakerKey]: payload.speaker } }));
    });

    const openTrack = async (track: CallTrack, stream: MediaStream) => {
      const dg = new DeepgramTrackStream({
        callId,
        track,
        diarize: track === 'system',
        elapsedMsAtConnect: elapsedMs,
        onFinal: (u) => runtime.socket?.emit('call:utterance', { callId, ...u }),
        onInterim: ({ text }) => set((s) => ({ interim: { ...s.interim, [track]: text } })),
        onState: (state) => set((s) => ({ streamState: { ...s.streamState, [track]: state } })),
      });
      runtime.streams[track] = dg;
      await dg.start();
      runtime.taps.push(await startPcmTap(stream, (frame) => dg.send(frame)));
    };

    await openTrack('mic', streams.mic);
    // macOS has no loopback capture, so a call there is mic-only by necessity.
    if (streams.system) await openTrack('system', streams.system);
  },

  pushFrame: (track, frame) => runtime.streams[track]?.send(frame),

  renameSpeaker: (speakerKey, displayName) => {
    const callId = get().callId;
    if (!callId) return;
    runtime.socket?.emit('call:speaker-rename', { callId, speakerKey, displayName });
  },

  finish: () => {
    for (const tap of runtime.taps) tap.stop();
    runtime.taps = [];
    for (const stream of Object.values(runtime.streams)) stream?.stop();
    runtime.streams = {};
    set({ interim: { mic: '', system: '' }, streamState: { mic: 'stopped', system: 'stopped' }, suggestion: null });
  },

  reset: () => {
    get().finish();
    disconnectCallsSocket();
    runtime.socket = null;
    set({ callId: null, utterances: [], speakers: {}, available: false, suggestion: null });
  },
}));
