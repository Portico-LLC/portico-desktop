import { useCallback, useEffect, useRef, useState } from 'react';
import { drawVideoCover, pickSupportedMimeType, roundedRectPath } from './canvasUtils';
import { mapMediaError } from './permissions';
import type {
  CameraPosition,
  CameraShape,
  RecordingEngineState,
  RecordingResult,
  StartRecordingOptions,
} from './types';

const CAMERA_SIZE_FRACTION = 0.22;
const CAMERA_BORDER_RADIUS = 14;

function makeHiddenVideo(stream: MediaStream): HTMLVideoElement {
  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  return video;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function useRecordingEngine() {
  const [state, setState] = useState<RecordingEngineState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [result, setResult] = useState<RecordingResult | null>(null);

  const cameraShapeRef = useRef<CameraShape>('circle');
  const cameraPositionRef = useRef<CameraPosition>({ xPct: 1, yPct: 1 });
  const cameraEnabledRef = useRef(true);
  const modeRef = useRef<StartRecordingOptions['mode']>('screen');

  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const screenVideoElRef = useRef<HTMLVideoElement | null>(null);
  const cameraVideoElRef = useRef<HTMLVideoElement | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const micGainRef = useRef<GainNode | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('video/webm');

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const pausedAccumRef = useRef(0);
  const pauseStartRef = useRef(0);
  const elapsedRef = useRef(0);

  const setCameraShape = useCallback((shape: CameraShape) => {
    cameraShapeRef.current = shape;
  }, []);

  const setCameraPosition = useCallback((pos: CameraPosition) => {
    cameraPositionRef.current = pos;
  }, []);

  const setCameraEnabled = useCallback((enabled: boolean) => {
    cameraEnabledRef.current = enabled;
  }, []);

  const setMicMuted = useCallback((muted: boolean) => {
    if (micGainRef.current) micGainRef.current.gain.value = muted ? 0 : 1;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mode = modeRef.current;
    const screenVideo = screenVideoElRef.current;
    const camVideo = cameraVideoElRef.current;

    if (mode === 'camera') {
      if (camVideo && camVideo.videoWidth) {
        if (canvas.width !== camVideo.videoWidth || canvas.height !== camVideo.videoHeight) {
          canvas.width = camVideo.videoWidth;
          canvas.height = camVideo.videoHeight;
        }
        ctx.drawImage(camVideo, 0, 0, canvas.width, canvas.height);
      }
    } else {
      if (screenVideo && screenVideo.videoWidth) {
        if (canvas.width !== screenVideo.videoWidth || canvas.height !== screenVideo.videoHeight) {
          canvas.width = screenVideo.videoWidth;
          canvas.height = screenVideo.videoHeight;
        }
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
      }

      if (mode === 'screen-camera' && cameraEnabledRef.current && camVideo && camVideo.videoWidth) {
        const shape = cameraShapeRef.current;
        const pos = cameraPositionRef.current;
        const bubbleW = canvas.width * CAMERA_SIZE_FRACTION;
        const bubbleH =
          shape === 'rect' ? bubbleW / (camVideo.videoWidth / camVideo.videoHeight) : bubbleW;
        const x = pos.xPct * Math.max(0, canvas.width - bubbleW);
        const y = pos.yPct * Math.max(0, canvas.height - bubbleH);

        ctx.save();
        ctx.beginPath();
        if (shape === 'circle') {
          ctx.arc(x + bubbleW / 2, y + bubbleH / 2, bubbleW / 2, 0, Math.PI * 2);
        } else {
          roundedRectPath(ctx, x, y, bubbleW, bubbleH, CAMERA_BORDER_RADIUS);
        }
        ctx.closePath();
        ctx.clip();
        drawVideoCover(ctx, camVideo, x, y, bubbleW, bubbleH);
        ctx.restore();

        ctx.save();
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(252, 251, 248, 0.9)';
        ctx.beginPath();
        if (shape === 'circle') {
          ctx.arc(x + bubbleW / 2, y + bubbleH / 2, bubbleW / 2 - 1.5, 0, Math.PI * 2);
        } else {
          roundedRectPath(ctx, x + 1.5, y + 1.5, bubbleW - 3, bubbleH - 3, CAMERA_BORDER_RADIUS);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  const cleanupStreams = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopStream(screenStreamRef.current);
    stopStream(cameraStreamRef.current);
    stopStream(micStreamRef.current);
    screenStreamRef.current = null;
    cameraStreamRef.current = null;
    micStreamRef.current = null;
    screenVideoElRef.current = null;
    cameraVideoElRef.current = null;
    micGainRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    canvasRef.current = null;
    recorderRef.current = null;
  }, []);

  // Safety net for navigating away (or the whole app closing) mid-recording —
  // without this, the camera/mic/screen tracks stay live forever since nothing
  // else ever calls stop() in that case.
  useEffect(() => cleanupStreams, [cleanupStreams]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  }, []);

  const start = useCallback(
    async (opts: StartRecordingOptions) => {
      setError(null);
      setResult(null);
      setState('starting');
      modeRef.current = opts.mode;
      cameraShapeRef.current = opts.cameraShape;
      cameraPositionRef.current = opts.cameraPosition;
      cameraEnabledRef.current = opts.mode !== 'screen';

      try {
        let screenStream: MediaStream | null = null;
        let systemAudioTrack: MediaStreamTrack | null = null;
        if (opts.mode !== 'camera') {
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: opts.systemAudioEnabled,
          });
          screenStreamRef.current = screenStream;
          systemAudioTrack = opts.systemAudioEnabled
            ? screenStream.getAudioTracks()[0] ?? null
            : null;
          // The browser/OS "Stop sharing" control ends the video track directly —
          // treat that exactly like the user pressing our own Stop button.
          screenStream.getVideoTracks()[0]?.addEventListener('ended', () => stop());
          const video = makeHiddenVideo(screenStream);
          await video.play();
          screenVideoElRef.current = video;
        }

        let cameraStream: MediaStream | null = null;
        if (opts.mode !== 'screen') {
          cameraStream = await navigator.mediaDevices.getUserMedia({
            video: opts.cameraDeviceId ? { deviceId: { exact: opts.cameraDeviceId } } : true,
          });
          cameraStreamRef.current = cameraStream;
          const video = makeHiddenVideo(cameraStream);
          await video.play();
          cameraVideoElRef.current = video;
        }

        let micStream: MediaStream | null = null;
        if (opts.micEnabled) {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: opts.micDeviceId ? { deviceId: { exact: opts.micDeviceId } } : true,
          });
          micStreamRef.current = micStream;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        canvasRef.current = canvas;
        rafRef.current = requestAnimationFrame(draw);

        const canvasStream = canvas.captureStream(30);
        let audioTrack: MediaStreamTrack | null = null;
        const hasMic = !!micStream?.getAudioTracks().length;
        if (hasMic || systemAudioTrack) {
          const audioContext = new AudioContext();
          audioContextRef.current = audioContext;
          const destination = audioContext.createMediaStreamDestination();
          if (hasMic && micStream) {
            const gain = audioContext.createGain();
            micGainRef.current = gain;
            audioContext.createMediaStreamSource(micStream).connect(gain).connect(destination);
          }
          if (systemAudioTrack) {
            audioContext
              .createMediaStreamSource(new MediaStream([systemAudioTrack]))
              .connect(destination);
          }
          audioTrack = destination.stream.getAudioTracks()[0] ?? null;
        }

        const outputTracks = [...canvasStream.getVideoTracks()];
        if (audioTrack) outputTracks.push(audioTrack);
        const outputStream = new MediaStream(outputTracks);

        const mimeType = pickSupportedMimeType();
        mimeTypeRef.current = mimeType;
        const recorder = new MediaRecorder(outputStream, {
          mimeType,
          videoBitsPerSecond: 6_000_000,
        });
        chunksRef.current = [];
        recorder.ondataavailable = (evt) => {
          if (evt.data.size) chunksRef.current.push(evt.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
          const durationSeconds = Math.round(elapsedRef.current);
          cleanupStreams();
          setResult({ blob, mimeType: mimeTypeRef.current, durationSeconds });
          setState('stopped');
        };
        recorderRef.current = recorder;
        recorder.start(1000);

        startTimeRef.current = performance.now();
        pausedAccumRef.current = 0;
        elapsedRef.current = 0;
        setElapsedSeconds(0);
        timerRef.current = window.setInterval(() => {
          const elapsed =
            (performance.now() - startTimeRef.current - pausedAccumRef.current) / 1000;
          elapsedRef.current = elapsed;
          setElapsedSeconds(Math.floor(elapsed));
        }, 250);

        setState('recording');
      } catch (err) {
        cleanupStreams();
        setError(mapMediaError(err));
        setState('error');
      }
    },
    [cleanupStreams, draw, stop],
  );

  const pause = useCallback(() => {
    if (recorderRef.current?.state !== 'recording') return;
    recorderRef.current.pause();
    pauseStartRef.current = performance.now();
    setState('paused');
  }, []);

  const resume = useCallback(() => {
    if (recorderRef.current?.state !== 'paused') return;
    pausedAccumRef.current += performance.now() - pauseStartRef.current;
    recorderRef.current.resume();
    setState('recording');
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setState('idle');
  }, []);

  return {
    state,
    error,
    elapsedSeconds,
    result,
    start,
    pause,
    resume,
    stop,
    reset,
    setCameraShape,
    setCameraPosition,
    setCameraEnabled,
    setMicMuted,
  };
}

export type RecordingEngine = ReturnType<typeof useRecordingEngine>;
