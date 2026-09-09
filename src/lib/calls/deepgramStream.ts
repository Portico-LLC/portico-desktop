import { DeepgramClient } from '@deepgram/sdk';
import { api } from '@/lib/api';

export type CallTrack = 'mic' | 'system';
export type StreamState = 'connecting' | 'streaming' | 'reconnecting' | 'stopped';

export interface FinalUtterance {
  track: CallTrack;
  speakerTag?: number;
  text: string;
  startMs: number;
  endMs: number;
  confidence?: number;
}

export interface InterimUpdate {
  track: CallTrack;
  text: string;
}

interface DeepgramWord {
  word: string;
  punctuated_word?: string;
  start: number;
  end: number;
  speaker?: number;
  confidence?: number;
}

interface DeepgramResults {
  type?: string;
  is_final?: boolean;
  channel?: { alternatives?: { transcript?: string; words?: DeepgramWord[]; confidence?: number }[] };
}

interface StreamOptions {
  callId: string;
  track: CallTrack;
  /** Diarization is only meaningful on the system track — the mic is one known person. */
  diarize: boolean;
  /** Call-elapsed milliseconds at connect time. Deepgram's word timings restart
   *  from zero on every connection, so this anchors them to the call's timeline. */
  elapsedMsAtConnect: () => number;
  onFinal: (utterance: FinalUtterance) => void;
  onInterim: (update: InterimUpdate) => void;
  onState: (state: StreamState) => void;
}

const MAX_RECONNECT_ATTEMPTS = 8;
const BASE_BACKOFF_MS = 250;
const MAX_BACKOFF_MS = 4000;
const KEEPALIVE_MS = 5000;

/** Splits a finalized segment into contiguous single-speaker runs. Deepgram labels
 *  speakers per *word*, so one finalized segment can legitimately span a handover
 *  between two people — emitting it as a single utterance would attribute half of
 *  it to the wrong speaker. */
function splitBySpeaker(words: DeepgramWord[]): { speakerTag?: number; words: DeepgramWord[] }[] {
  const runs: { speakerTag?: number; words: DeepgramWord[] }[] = [];
  for (const word of words) {
    const last = runs[runs.length - 1];
    if (last && last.speakerTag === word.speaker) last.words.push(word);
    else runs.push({ speakerTag: word.speaker, words: [word] });
  }
  return runs;
}

/**
 * One Deepgram streaming connection for one audio track. Audio goes straight from
 * the desktop app to Deepgram — the Portico API only mints the short-lived token
 * and later receives the settled text, so a backend deploy can't cut a live call.
 */
export class DeepgramTrackStream {
  private connection: Awaited<ReturnType<DeepgramClient['listen']['v1']['createConnection']>> | null = null;
  private keepAlive: number | null = null;
  private attempts = 0;
  private stopped = false;
  private offsetMs = 0;
  private opts: StreamOptions;

  constructor(opts: StreamOptions) {
    this.opts = opts;
  }

  async start(): Promise<void> {
    this.stopped = false;
    await this.connect();
  }

  private async connect(): Promise<void> {
    if (this.stopped) return;
    this.opts.onState(this.attempts === 0 ? 'connecting' : 'reconnecting');

    let accessToken: string;
    let model: string;
    try {
      // Re-minted per connection: grant tokens are short-lived by design and a
      // call outlives them many times over.
      const { data } = await api.post<{ accessToken: string; model: string }>(
        `/calls/${this.opts.callId}/stream-token`,
      );
      accessToken = data.accessToken;
      model = data.model;
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.offsetMs = this.opts.elapsedMsAtConnect();

    const client = new DeepgramClient({ accessToken });
    const connection = await client.listen.v1.createConnection({
      model,
      language: 'en',
      encoding: 'linear16',
      sample_rate: '16000',
      channels: '1',
      punctuate: 'true',
      smart_format: 'true',
      interim_results: 'true',
      endpointing: '300',
      utterance_end_ms: '1000',
      vad_events: 'true',
      // v2 is batch-only and is rejected outright on streaming connections.
      ...(this.opts.diarize ? { diarize: 'true', diarize_model: 'v1' } : {}),
    });

    connection.on('open', () => {
      this.attempts = 0;
      this.opts.onState('streaming');
    });
    // The SDK types this as a union across every streaming message shape
    // (Results, Metadata, UtteranceEnd, SpeechStarted…); handleMessage narrows to
    // the Results shape and ignores the rest.
    connection.on('message', (data) => this.handleMessage(data as unknown as DeepgramResults));
    connection.on('error', () => this.scheduleReconnect());
    connection.on('close', () => this.scheduleReconnect());

    this.connection = connection;
    connection.connect();
    await connection.waitForOpen();

    this.keepAlive = window.setInterval(() => {
      // Deepgram closes an idle socket; a quiet participant is not a finished call.
      try {
        this.connection?.sendMedia(new Uint8Array(0));
      } catch {
        /* the reconnect path owns recovery */
      }
    }, KEEPALIVE_MS);
  }

  private handleMessage(data: DeepgramResults): void {
    if (data?.type && data.type !== 'Results') return;
    const alternative = data.channel?.alternatives?.[0];
    if (!alternative) return;

    if (!data.is_final) {
      if (alternative.transcript) this.opts.onInterim({ track: this.opts.track, text: alternative.transcript });
      return;
    }

    const words = alternative.words ?? [];
    if (!words.length) {
      if (alternative.transcript?.trim()) {
        this.opts.onFinal({
          track: this.opts.track,
          text: alternative.transcript.trim(),
          startMs: this.offsetMs,
          endMs: this.offsetMs,
          confidence: alternative.confidence,
        });
      }
      this.opts.onInterim({ track: this.opts.track, text: '' });
      return;
    }

    for (const run of splitBySpeaker(words)) {
      const text = run.words.map((w) => w.punctuated_word ?? w.word).join(' ').trim();
      if (!text) continue;
      this.opts.onFinal({
        track: this.opts.track,
        // The mic track is the employee by construction; a speaker tag there would
        // only add noise.
        speakerTag: this.opts.diarize ? run.speakerTag : undefined,
        text,
        startMs: this.offsetMs + run.words[0].start * 1000,
        endMs: this.offsetMs + run.words[run.words.length - 1].end * 1000,
        confidence: alternative.confidence,
      });
    }
    this.opts.onInterim({ track: this.opts.track, text: '' });
  }

  send(frame: ArrayBuffer): void {
    const connection = this.connection;
    if (!connection) return;
    try {
      connection.sendMedia(new Uint8Array(frame));
    } catch {
      // Dropping a frame is strictly better than queueing realtime audio that
      // would arrive too late to be useful.
    }
  }

  private scheduleReconnect(): void {
    this.teardownConnection();
    if (this.stopped) return;
    if (this.attempts >= MAX_RECONNECT_ATTEMPTS) {
      this.opts.onState('stopped');
      return;
    }
    const delay = Math.min(BASE_BACKOFF_MS * 2 ** this.attempts, MAX_BACKOFF_MS);
    this.attempts += 1;
    this.opts.onState('reconnecting');
    window.setTimeout(() => void this.connect(), delay);
  }

  private teardownConnection(): void {
    if (this.keepAlive !== null) {
      window.clearInterval(this.keepAlive);
      this.keepAlive = null;
    }
    const connection = this.connection;
    this.connection = null;
    if (!connection) return;
    try {
      connection.close();
    } catch {
      /* already gone */
    }
  }

  stop(): void {
    this.stopped = true;
    try {
      this.connection?.sendFinalize({ type: 'Finalize' });
    } catch {
      /* nothing left to flush */
    }
    this.teardownConnection();
    this.opts.onState('stopped');
  }
}
