import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatDuration } from './useAttachmentUrl';
import { Play, Pause, Volume2, VolumeX, Maximize, PictureInPicture2, Loader2 } from 'lucide-react';

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

/**
 * Video with Portico's own transport chrome rather than the browser default, which looks
 * like a different product on every OS.
 *
 * Built on a plain `<video>` element — no dependency. The controls track the element rather
 * than mirroring it into state, so scrubbing, keyboard shortcuts and the OS media keys can
 * never disagree about where playback actually is.
 */
export function VideoPlayer({
  src,
  poster,
  aspectRatio,
  className,
}: {
  src: string;
  poster?: string;
  aspectRatio?: number;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 2600);
  }, []);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  }, []);

  const seekBy = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(0, video.currentTime + delta), video.duration || 0);
    showControls();
  }, [showControls]);

  /**
   * Shortcuts are scoped to the player, not the document: chat has a composer that is
   * focused most of the time, and a global space-to-play would eat every space the user
   * types.
   */
  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case ' ':
      case 'k':
        event.preventDefault();
        togglePlay();
        break;
      case 'ArrowRight':
        event.preventDefault();
        seekBy(5);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        seekBy(-5);
        break;
      case 'm':
        event.preventDefault();
        setMuted((m) => !m);
        break;
      case 'f':
        event.preventDefault();
        void toggleFullscreen();
        break;
      default:
        break;
    }
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await container.requestFullscreen();
    } catch {
      // Fullscreen can be blocked by permissions policy inside an iframe — not worth
      // surfacing, the video still plays inline.
    }
  };

  const togglePip = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      // Not supported everywhere (notably Firefox's programmatic API); silently ignore.
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
    video.playbackRate = speed;
  }, [volume, muted, speed]);

  const onScrub = (event: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = (Number(event.target.value) / 100) * duration;
  };

  const progress = duration ? (current / duration) * 100 : 0;
  const bufferedPercent = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseMove={showControls}
      onMouseLeave={() => playing && setControlsVisible(false)}
      className={cn(
        'group relative overflow-hidden rounded-lg border border-ink-200 bg-ink-950 outline-none',
        'focus-visible:ring-2 focus-visible:ring-brass-500',
        className,
      )}
      style={aspectRatio ? { aspectRatio: String(aspectRatio) } : undefined}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        className="h-full w-full bg-ink-950 object-contain"
        onClick={togglePlay}
        onPlay={() => { setPlaying(true); showControls(); }}
        onPause={() => { setPlaying(false); setControlsVisible(true); }}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
          setCurrent(video.currentTime);
          if (video.buffered.length) setBuffered(video.buffered.end(video.buffered.length - 1));
        }}
        onEnded={() => setPlaying(false)}
      />

      {waiting && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-bone-50/80" />
        </div>
      )}

      {!playing && !waiting && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play video"
          className="absolute inset-0 flex items-center justify-center transition-opacity duration-hover ease-brand"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-950/70 text-bone-50 backdrop-blur-0 transition-transform duration-press ease-brand hover:scale-105">
            <Play size={24} className="ml-0.5" fill="currentColor" />
          </span>
        </button>
      )}

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/90 to-transparent px-3 pb-2 pt-6',
          'transition-opacity duration-transition ease-brand',
          controlsVisible || !playing ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div className="relative flex items-center">
          {/* Buffered range sits behind the scrubber so loading progress is visible. */}
          <div className="pointer-events-none absolute inset-x-0 h-1 rounded-full bg-bone-50/25">
            <div className="h-full rounded-full bg-bone-50/35" style={{ width: `${bufferedPercent}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-brass-500" style={{ width: `${progress}%` }} />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progress}
            onChange={onScrub}
            aria-label="Seek"
            className="relative h-1 w-full cursor-pointer appearance-none bg-transparent
              [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brass-500
              [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-brass-500"
          />
        </div>

        <div className="mt-1.5 flex items-center gap-2 text-bone-50">
          <button type="button" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} className="p-1 hover:text-brass-300">
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <div className="group/vol flex items-center gap-1.5">
            <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'} className="p-1 hover:text-brass-300">
              {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => { setVolume(Number(e.target.value)); setMuted(false); }}
              aria-label="Volume"
              className="h-1 w-0 cursor-pointer appearance-none rounded-full bg-bone-50/30 opacity-0 transition-all duration-transition ease-brand
                group-hover/vol:w-16 group-hover/vol:opacity-100
                [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-bone-50"
            />
          </div>

          <span className="font-mono text-[11px] tabular-nums text-bone-50/80">
            {formatDuration(current)} / {formatDuration(duration)}
          </span>

          <div className="ml-auto flex items-center gap-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => setSpeedOpen((o) => !o)}
                className="rounded-sm px-1.5 py-1 font-mono text-[11px] tabular-nums hover:text-brass-300"
                aria-label="Playback speed"
              >
                {speed}x
              </button>
              {speedOpen && (
                <div className="absolute bottom-full right-0 mb-1 overflow-hidden rounded-md border border-ink-700 bg-ink-900 py-1 shadow-md">
                  {SPEEDS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => { setSpeed(option); setSpeedOpen(false); }}
                      className={cn(
                        'block w-full px-3 py-1 text-left font-mono text-[11px] tabular-nums hover:bg-ink-800',
                        option === speed ? 'text-brass-400' : 'text-bone-50/80',
                      )}
                    >
                      {option}x
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={togglePip} aria-label="Picture in picture" className="p-1 hover:text-brass-300">
              <PictureInPicture2 size={15} />
            </button>
            <button type="button" onClick={toggleFullscreen} aria-label="Fullscreen" className="p-1 hover:text-brass-300">
              <Maximize size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
