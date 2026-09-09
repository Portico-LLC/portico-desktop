import { DeepgramClient } from '@deepgram/sdk';
import { api } from '@/lib/api';

export type CallTrack = 'mic' | 'system';
export type StreamState = 'connecting' | 'streaming' | 'reconnecting' | 'stopped';

export interface FinalUtterance {
  track: CallTrack;
  speakerTag?: number;
  /** Diarization was thrashing across the segment this came from — two remote
   *  speakers talking over each other. Shown as uncertain, and never used to
   *  trigger a coach suggestion. */
  overlapped?: boolean;
  text: string;
  startMs: number;
  endMs: number;
  /** Mean per-word confidence for this run, not the whole segment. */
  confidence?: number;
  wordCount?: number;
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
/** How long a connection must stay open before its reconnect budget is forgiven. */
const STABLE_OPEN_MS = 10000;
/** 401/403 = this caller may not stream; 404 = the call is gone; 503 = live
 *  transcription isn't configured on the server. None are worth a retry. */
const NON_RETRYABLE_TOKEN_STATUSES = new Set([401, 403, 404, 503]);

interface SpeakerRun {
  speakerTag?: number;
  words: DeepgramWord[];
}

/** A run this short between two runs of the same speaker is diarization flicker,
 *  not a real handover — nobody interjects one word and vanishes. */
const MICRO_RUN_WORDS = 2;
/** More speaker alternations than this inside one finalized segment means
 *  diarization is guessing, which in practice means two remote people are talking
 *  over each other on the shared system track. */
const MAX_SPEAKER_FLIPS = 2;

/** Splits a finalized segment into contiguous single-speaker runs. Deepgram labels
 *  speakers per *word*, so one finalized segment can legitimately span a handover
 *  between two people — emitting it as a single utterance would attribute half of
 *  it to the wrong speaker. */
function splitBySpeaker(words: DeepgramWord[]): SpeakerRun[] {
  const runs: SpeakerRun[] = [];
  for (const word of words) {
    const last = runs[runs.length - 1];
    if (last && last.speakerTag === word.speaker) last.words.push(word);
    else runs.push({ speakerTag: word.speaker, words: [word] });
  }
  return runs;
}

/** Absorbs one- and two-word runs back into their neighbour when the speakers on
 *  either side agree. Without this, a single flickered word splits one sentence
 *  into three utterances attributed to two different people. */
function mergeMicroRuns(runs: SpeakerRun[]): SpeakerRun[] {
  if (runs.length < 3) return runs;
  const merged: SpeakerRun[] = [runs[0]];
  for (let i = 1; i < runs.length; i++) {
    const current = runs[i];
    const previous = merged[merged.length - 1];
    const next = runs[i + 1];
    const isFlicker =
      current.words.length <= MICRO_RUN_WORDS && next && previous.speakerTag === next.speakerTag;
    if (isFlicker || previous.speakerTag === current.speakerTag) previous.words.push(...current.words);
    else merged.push(current);
  }
  return merged;
}

/** Mean of the per-word confidences. Deepgram's `alternative.confidence` describes the
 *  whole segment, so reusing it for each split run would report identical confidence
 *  for a clearly-heard sentence and the mumble next to it. */
function runConfidence(words: DeepgramWord[]): number | undefined {
  const scored = words.filter((w) => typeof w.confidence === 'number');
  if (!scored.length) return undefined;
  return scored.reduce((sum, w) => sum + (w.confidence ?? 0), 0) / scored.length;
}

/** True when diarization was thrashing across this segment. Two remote speakers on
 *  one mixed track genuinely cannot be separated, so the honest move is to mark the
 *  result uncertain rather than present a confident guess. */
function looksOverlapped(runs: SpeakerRun[]): boolean {
  if (runs.length <= MAX_SPEAKER_FLIPS) return false;
  const shortRuns = runs.filter((r) => r.words.length < 4).length;
  return shortRuns >= MAX_SPEAKER_FLIPS;
}

/**
 * One Deepgram streaming connection for one audio track. Audio goes straight from
 * the desktop app to Deepgram — the Portico API only mints the short-lived token
 * and later receives the settled text, so a backend deploy can't cut a live call.
 */
export class DeepgramTrackStream {
  private connection: Awaited<ReturnType<DeepgramClient['listen']['v1']['createConnection']>> | null = null;
  private keepAlive: number | null = null;
  private reconnectTimer: number | null = null;
  private attempts = 0;
  private stopped = false;
  private offsetMs = 0;
  private lastMediaAt = 0;
  // The SDK's socket exposes `on` but no `off`, so a replaced connection keeps
  // firing close/error at us forever. Every connection gets a generation, and
  // handlers from a stale one are ignored — otherwise a dead socket's late
  // 'close' tears down the healthy socket that replaced it.
  private generation = 0;
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
    let keyterms: string[] = [];
    try {
      // Re-minted per connection: grant tokens are short-lived by design and a
      // call outlives them many times over.
      const { data } = await api.post<{ accessToken: string; model: string; keyterms?: string[] }>(
        `/calls/${this.opts.callId}/stream-token`,
      );
      accessToken = data.accessToken;
      model = data.model;
      keyterms = data.keyterms ?? [];
    } catch (err) {
      // "Not configured" and "not allowed" don't get better by asking again —
      // retrying those eight times just delays the fallback to post-call
      // transcription, which is already running regardless.
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status && NON_RETRYABLE_TOKEN_STATUSES.has(status)) {
        this.stopped = true;
        this.opts.onState('stopped');
        return;
      }
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
      // 300ms cuts a thinking pause into separate finals, which starves diarization
      // and splits questions mid-clause. 500ms still settles inside the ~1s budget.
      endpointing: '500',
      utterance_end_ms: '1000',
      vad_events: 'true',
      // Proper nouns are where most perceived "hallucination" actually comes from —
      // a mangled client or project name. nova-3 only; sending it to another model
      // family would be rejected, so the backend gates on that before returning any.
      ...(keyterms.length ? { keyterm: keyterms } : {}),
      // v2 is batch-only and is rejected outright on streaming connections.
      ...(this.opts.diarize ? { diarize: 'true', diarize_model: 'v1' } : {}),
    });

    const generation = ++this.generation;
    const isCurrent = () => generation === this.generation && !this.stopped;

    connection.on('open', () => {
      if (!isCurrent()) return;
      this.opts.onState('streaming');
      // Forgive the retry budget only once this connection has proved stable.
      // Resetting on 'open' alone lets a flapping socket reconnect forever
      // instead of giving up and letting post-call transcription take over.
      window.setTimeout(() => {
        if (isCurrent()) this.attempts = 0;
      }, STABLE_OPEN_MS);
    });
    // The SDK types this as a union across every streaming message shape
    // (Results, Metadata, UtteranceEnd, SpeechStarted…); handleMessage narrows to
    // the Results shape and ignores the rest.
    connection.on('message', (data) => {
      if (!isCurrent()) return;
      this.handleMessage(data as unknown as DeepgramResults);
    });
    connection.on('error', () => {
      if (isCurrent()) this.scheduleReconnect();
    });
    connection.on('close', () => {
      if (isCurrent()) this.scheduleReconnect();
    });

    this.connection = connection;
    this.lastMediaAt = Date.now();
    connection.connect();
    await connection.waitForOpen();

    this.keepAlive = window.setInterval(() => {
      if (!isCurrent()) return;
      // Only while genuinely idle. Deepgram drops a socket after 10s with neither
      // audio nor a keepalive, but a keepalive mid-speech is pointless traffic.
      if (Date.now() - this.lastMediaAt < KEEPALIVE_MS) return;
      try {
        // MUST be this text frame. An empty binary payload via sendMedia is the
        // end-of-stream signal, not a ping — that is what was silently killing
        // the connection a few seconds into every call.
        this.connection?.sendKeepAlive({ type: 'KeepAlive' });
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

    const rawRuns = splitBySpeaker(words);
    const overlapped = this.opts.diarize && looksOverlapped(rawRuns);

    for (const run of mergeMicroRuns(rawRuns)) {
      const text = run.words.map((w) => w.punctuated_word ?? w.word).join(' ').trim();
      if (!text) continue;
      this.opts.onFinal({
        track: this.opts.track,
        // The mic track is the employee by construction; a speaker tag there would
        // only add noise.
        speakerTag: this.opts.diarize ? run.speakerTag : undefined,
        overlapped,
        text,
        startMs: this.offsetMs + run.words[0].start * 1000,
        endMs: this.offsetMs + run.words[run.words.length - 1].end * 1000,
        confidence: runConfidence(run.words),
        wordCount: run.words.length,
      });
    }
    this.opts.onInterim({ track: this.opts.track, text: '' });
  }

  send(frame: ArrayBuffer): void {
    const connection = this.connection;
    if (!connection) return;
    try {
      connection.sendMedia(new Uint8Array(frame));
      this.lastMediaAt = Date.now();
    } catch {
      // Dropping a frame is strictly better than queueing realtime audio that
      // would arrive too late to be useful.
    }
  }

  private scheduleReconnect(): void {
    // teardownConnection() calls close(), which synchronously fires 'close' and
    // re-enters here. Without this guard each drop scheduled two or more
    // reconnects, which compounded into a connection storm.
    if (this.reconnectTimer !== null) return;

    this.teardownConnection();
    if (this.stopped) return;
    if (this.attempts >= MAX_RECONNECT_ATTEMPTS) {
      this.opts.onState('stopped');
      return;
    }
    const delay = Math.min(BASE_BACKOFF_MS * 2 ** this.attempts, MAX_BACKOFF_MS);
    this.attempts += 1;
    this.opts.onState('reconnecting');
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
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
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    try {
      // Flushes whatever Deepgram is still holding, so the last words spoken
      // before the user hit End still come back as a final.
      this.connection?.sendFinalize({ type: 'Finalize' });
    } catch {
      /* nothing left to flush */
    }
    this.teardownConnection();
    this.opts.onState('stopped');
  }
}
