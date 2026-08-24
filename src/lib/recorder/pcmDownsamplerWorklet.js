// AudioWorkletProcessor — runs in its own isolated global scope (no DOM, no
// module imports), which is why this is plain JS loaded by URL rather than a
// TS module. The AudioContext that owns this node must be created with
// `{ sampleRate: 24000 }` — Web Audio resamples the incoming track to that
// rate automatically, so `sampleRate` here (an AudioWorkletGlobalScope
// global) is already 24000 and no manual resampling math is needed. This
// only converts Float32 samples to PCM16 and batches them into ~200ms
// buffers, matching the OpenAI Realtime transcription session's expected
// input_audio_format (see realtime-transcription-session.ts on the backend).
const CHUNK_MS = 200;

class PCMDownsamplerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = [];
    this.chunkSampleCount = Math.round((sampleRate * CHUNK_MS) / 1000);
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel) {
      for (let i = 0; i < channel.length; i++) this.samples.push(channel[i]);

      if (this.samples.length >= this.chunkSampleCount) {
        const pcm16 = new Int16Array(this.samples.length);
        for (let i = 0; i < this.samples.length; i++) {
          const s = Math.max(-1, Math.min(1, this.samples[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
        this.samples = [];
      }
    }
    return true;
  }
}

registerProcessor('pcm-downsampler', PCMDownsamplerProcessor);
