/**
 * Converts a live MediaStream into the 16 kHz mono linear16 frames Deepgram wants.
 *
 * The AudioContext runs at the device rate (48 kHz, sometimes 44.1 kHz), so
 * reaching 16 kHz means resampling. Dropping every third sample would alias
 * everything above 8 kHz back down into the speech band and measurably worsen
 * transcription, so the worklet low-passes first and then interpolates.
 *
 * Shipped as a source string and loaded from a blob URL: AudioWorklet modules must
 * be fetched by URL, and this keeps it working identically under Vite dev, a built
 * bundle, and the Electron file:// load without any bundler configuration.
 */
const WORKLET_SOURCE = `
const TARGET_RATE = 16000;
const CUTOFF_HZ = 7200;
const FIR_TAPS = 31;
const FRAME_SAMPLES = 800; // 50ms at 16kHz

function buildLowPass(inputRate) {
  const fc = Math.min(CUTOFF_HZ / inputRate, 0.5);
  const mid = (FIR_TAPS - 1) / 2;
  const taps = new Float32Array(FIR_TAPS);
  let sum = 0;
  for (let i = 0; i < FIR_TAPS; i++) {
    const n = i - mid;
    const sinc = n === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * n) / (Math.PI * n);
    const hamming = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (FIR_TAPS - 1));
    taps[i] = sinc * hamming;
    sum += taps[i];
  }
  for (let i = 0; i < FIR_TAPS; i++) taps[i] /= sum;
  return taps;
}

class PcmDownsampler extends AudioWorkletProcessor {
  constructor() {
    super();
    this.taps = buildLowPass(sampleRate);
    this.history = new Float32Array(FIR_TAPS);
    this.step = sampleRate / TARGET_RATE;
    this.position = 0;
    this.out = new Int16Array(FRAME_SAMPLES);
    this.outIndex = 0;
    this.closed = false;
    this.port.onmessage = (e) => { if (e.data === 'stop') this.closed = true; };
  }

  filteredAt(input, index) {
    let acc = 0;
    for (let t = 0; t < FIR_TAPS; t++) {
      const src = index - t;
      const sample = src >= 0 ? input[src] : this.history[FIR_TAPS + src];
      acc += sample * this.taps[t];
    }
    return acc;
  }

  process(inputs) {
    if (this.closed) return false;
    const channel = inputs[0] && inputs[0][0];
    if (!channel || channel.length === 0) return true;

    while (this.position < channel.length) {
      const i = Math.floor(this.position);
      const frac = this.position - i;
      const a = this.filteredAt(channel, i);
      const b = this.filteredAt(channel, Math.min(i + 1, channel.length - 1));
      const sample = a + (b - a) * frac;
      const clamped = Math.max(-1, Math.min(1, sample));
      this.out[this.outIndex++] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;

      if (this.outIndex === FRAME_SAMPLES) {
        const frame = this.out.slice(0);
        this.port.postMessage(frame.buffer, [frame.buffer]);
        this.outIndex = 0;
      }
      this.position += this.step;
    }
    this.position -= channel.length;

    const tail = Math.min(FIR_TAPS, channel.length);
    this.history.copyWithin(0, tail);
    this.history.set(channel.subarray(channel.length - tail), FIR_TAPS - tail);
    return true;
  }
}

registerProcessor('pcm-downsampler', PcmDownsampler);
`;

let moduleUrl: string | null = null;

function workletUrl(): string {
  if (!moduleUrl) moduleUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'application/javascript' }));
  return moduleUrl;
}

export interface PcmTap {
  stop: () => void;
}

/** Taps a stream for 16 kHz linear16 frames without disturbing it — the same
 *  MediaStream stays connected to its MediaRecorder, so the archive recording
 *  this call depends on is completely unaffected. */
export async function startPcmTap(stream: MediaStream, onFrame: (frame: ArrayBuffer) => void): Promise<PcmTap> {
  const context = new AudioContext();
  await context.audioWorklet.addModule(workletUrl());

  const source = context.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(context, 'pcm-downsampler', {
    numberOfInputs: 1,
    numberOfOutputs: 0,
    channelCount: 1,
    channelCountMode: 'explicit',
  });
  node.port.onmessage = (event) => onFrame(event.data as ArrayBuffer);
  source.connect(node);

  let stopped = false;
  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      node.port.postMessage('stop');
      node.port.onmessage = null;
      try {
        source.disconnect();
      } catch {
        // The stream's tracks may already have ended; nothing to detach.
      }
      void context.close().catch(() => {});
    },
  };
}
