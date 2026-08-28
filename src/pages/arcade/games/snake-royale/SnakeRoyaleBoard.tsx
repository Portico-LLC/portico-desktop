import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { resolveSeatColorsHex, SEAT_COLOR_VARS } from '@/lib/arcade/playerColors';
import { motionTransition, springs } from '@/lib/motion/springs';
import { cn } from '@/lib/utils';
import { useSnakeRoyaleSocket } from './useSnakeRoyaleSocket';
import type {
  GameRoomDetail,
  GameRoomMemberType,
  Direction,
  ArenaBounds,
  GridPoint,
  SnakeSnapshotEntry,
  SnakeMatchEndPayload,
} from '@/lib/types';

interface SnakeRoyaleBoardProps {
  room: GameRoomDetail;
  onMatchEnd: (payload: SnakeMatchEndPayload) => void;
}

const VECTORS: Record<Direction, GridPoint> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };
const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'up',
  w: 'up',
  W: 'up',
  ArrowDown: 'down',
  s: 'down',
  S: 'down',
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
  ArrowRight: 'right',
  d: 'right',
  D: 'right',
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  createdAt: number;
  life: number;
  color: string;
  size: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// How fast a reconciliation error (predicted head vs. server-confirmed head) is eased out
// once it's known, instead of snapped. Half a tick at the default 90ms rate, so a correction
// is essentially invisible within ~2 ticks. See the tick-change block in `draw()`.
const HEAD_RECONCILE_HALF_LIFE_MS = 45;
// Above this, the "error" is treated as a discontinuity (reconnect/resume/backgrounded tab)
// rather than a normal misprediction, and is hard-reset instead of eased.
const HEAD_RECONCILE_SNAP_CELLS = 1.5;

interface ThemeColors {
  bg: string;
  surfaceMuted: string;
  gridLine: string;
  danger: string;
  dangerSoft: string;
  accent: string;
}

/** Reads the resolved CSS custom properties once. `getComputedStyle` forces a style recalc,
 *  so this is only ever called on mount and on a theme change — never inside the render
 *  loop, which was the main source of the reported frame drops/"lag" on lower-end devices. */
function readThemeColors(): ThemeColors {
  const styles = getComputedStyle(document.documentElement);
  return {
    bg: styles.getPropertyValue('--surface').trim(),
    surfaceMuted: styles.getPropertyValue('--surface-muted').trim(),
    gridLine: styles.getPropertyValue('--border').trim(),
    danger: styles.getPropertyValue('--danger').trim(),
    dangerSoft: styles.getPropertyValue('--danger-soft').trim(),
    accent: styles.getPropertyValue('--accent').trim(),
  };
}

interface GridCache {
  size: number;
  grid: number;
  color: string;
  canvas: HTMLCanvasElement;
}

/** The grid used to be re-stroked line-by-line (132 `stroke()` calls) every animation frame.
 *  It only ever changes when the canvas is resized, the round's grid size changes, or the
 *  theme toggles — so it's rendered once to an offscreen canvas and just blitted every
 *  frame after that. */
function getGridCanvas(cache: GridCache | null, canvasSize: number, gridSize: number, dpr: number, color: string): GridCache {
  if (cache && cache.size === canvasSize && cache.grid === gridSize && cache.color === color) return cache;
  const off = document.createElement('canvas');
  off.width = canvasSize * dpr;
  off.height = canvasSize * dpr;
  const octx = off.getContext('2d')!;
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cellSize = canvasSize / gridSize;
  octx.strokeStyle = color;
  octx.globalAlpha = 0.35;
  octx.lineWidth = 1;
  for (let i = 0; i <= gridSize; i++) {
    octx.beginPath();
    octx.moveTo(i * cellSize, 0);
    octx.lineTo(i * cellSize, canvasSize);
    octx.stroke();
    octx.beginPath();
    octx.moveTo(0, i * cellSize);
    octx.lineTo(canvasSize, i * cellSize);
    octx.stroke();
  }
  return { size: canvasSize, grid: gridSize, color, canvas: off };
}

function spawnBurst(particles: Particle[], center: GridPoint, color: string, now: number, count: number, speed: number, life: number) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
    const v = speed * (0.5 + Math.random() * 0.5);
    particles.push({
      x: center.x + 0.5,
      y: center.y + 0.5,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      createdAt: now,
      life,
      color,
      size: 1.5 + Math.random() * 1.5,
    });
  }
}

export function SnakeRoyaleBoard({ room, onMatchEnd }: SnakeRoyaleBoardProps) {
  const reduce = !!useReducedMotion();
  const authUser = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState(480);
  const [roundBanner, setRoundBanner] = useState<number | null>(null);

  const myMemberType: GameRoomMemberType = role === 'employee' ? 'employee' : 'owner';
  const mySeatIndex = room.members.find((m) => m.memberType === myMemberType && m.memberId === authUser?.id)?.seatIndex ?? null;

  const { bufferRef, deathsRef, roundStart, roundEnd, sendDirection } = useSnakeRoyaleSocket({ roomId: room.id, onMatchEnd });

  // ---- Local prediction / render-loop refs (imperative, not React state) ----
  const myDirectionRef = useRef<Direction>('up');
  // Where my own snake's head is drawn: advanced locally every frame using `myDirectionRef`
  // rather than waiting for the server's next tick, so turning feels instant. Re-anchored to
  // the server's confirmed head at the start of every tick (see the `current.tick !==
  // lastProcessedTickRef.current` block below). Movement per tick is driven by `tBody` (the
  // same clamped clock the body's interpolation uses — see `draw()`), so the head can never
  // outrun the body's timing the way an unclamped per-frame accumulator could.
  const predictedHeadRef = useRef<GridPoint | null>(null);
  // How much of the current tick's 1-cell movement allowance `predictedHeadRef` has already
  // walked (mirrors `tBody`, persisted across frames so a mid-tick turn only applies to the
  // remaining allowance instead of restarting it).
  const predictedProgressRef = useRef(0);
  // Rendered-minus-confirmed offset for the head, in grid units. Any authoritative correction
  // (a rejected turn, a reconnect) is absorbed here and eased to zero over a couple of ticks
  // instead of being applied as an instant snap.
  const headErrorRef = useRef<GridPoint>({ x: 0, y: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const visualBoundsRef = useRef<ArenaBounds | null>(null);
  const lastFrameAtRef = useRef<number>(performance.now());
  const lastProcessedTickRef = useRef(-1);
  const processedDeathCountRef = useRef(0);
  const shakeRef = useRef({ amount: 0 });
  const rafRef = useRef<number | null>(null);
  // Resolved CSS colors + the cached grid canvas — both read/rebuilt off the hot path, see
  // `readThemeColors`/`getGridCanvas` above.
  const themeColorsRef = useRef<ThemeColors>(readThemeColors());
  const gridCacheRef = useRef<GridCache | null>(null);

  // The only place `getComputedStyle` runs after mount: a real theme toggle, not every frame.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      themeColorsRef.current = readThemeColors();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Flash the round number briefly on every new round.
  useEffect(() => {
    if (!roundStart) return;
    setRoundBanner(roundStart.roundNumber);
    visualBoundsRef.current = roundStart.arenaBounds;
    particlesRef.current = [];
    // deathsRef.current is reset to [] by the hook on every round start — this counter has
    // to reset alongside it, or round 2's first few deaths would silently produce no
    // burst/shake until the stale count from round 1 is exceeded again.
    processedDeathCountRef.current = 0;
    // Drop any predicted head left over from the previous round so the new round seeds fresh
    // from the first confirmed snapshot instead of flashing a stale position for one frame.
    predictedHeadRef.current = null;
    predictedProgressRef.current = 0;
    headErrorRef.current = { x: 0, y: 0 };
    const t = setTimeout(() => setRoundBanner(null), 1400);
    return () => clearTimeout(t);
  }, [roundStart]);

  // ---- Responsive square canvas ----
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 480;
      setCanvasSize(Math.max(240, Math.min(640, Math.floor(width))));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ---- Input: keyboard + shared handler for the on-screen d-pad ----
  const myConfirmedDirection = (): Direction => {
    const current = bufferRef.current.current;
    const mine = current?.snakes.find((s) => s.seat === mySeatIndex);
    if (!mine || mine.segments.length < 2) return myDirectionRef.current;
    const head = mine.segments[0];
    const neck = mine.segments[1];
    if (head.x !== neck.x) return head.x > neck.x ? 'right' : 'left';
    return head.y > neck.y ? 'down' : 'up';
  };

  const requestDirection = (dir: Direction) => {
    sendDirection(dir);
    // Only adopt it for local extrapolation if it isn't an immediate reversal of the last
    // server-confirmed direction — otherwise the head would visually double back on itself
    // for a frame before the server's rejection catches up.
    if (dir !== OPPOSITE[myConfirmedDirection()]) myDirectionRef.current = dir;
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const dir = KEY_MAP[e.key];
      if (!dir) return;
      e.preventDefault();
      requestDirection(dir);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mySeatIndex]);

  // ---- Render loop ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const now = performance.now();
      const dt = now - lastFrameAtRef.current;
      lastFrameAtRef.current = now;

      const { prev, current } = bufferRef.current;
      if (!current) return;
      const gridSize = roundStart?.gridSize ?? 32;
      const tickMs = roundStart?.tickMs ?? 90;
      const cellSize = canvasSize / gridSize;
      const seatColors = resolveSeatColorsHex();
      const { bg, surfaceMuted, gridLine, danger, dangerSoft, accent } = themeColorsRef.current;
      gridCacheRef.current = getGridCanvas(gridCacheRef.current, canvasSize, gridSize, dpr, gridLine);
      // Wall-clock fraction of the current tick elapsed since it was received, clamped to 1 —
      // the same clock the body's interpolation below uses. Hoisted here because the head's
      // per-tick movement (below) is now driven by this same value, not a separate accumulator.
      const tBody = clamp((now - current.receivedAt) / tickMs, 0, 1);

      // One-off events for a newly-arrived tick: pickup-eaten bursts, and re-anchoring my
      // own predicted head to the server's now-confirmed position for this tick.
      if (current.tick !== lastProcessedTickRef.current) {
        if (prev) {
          for (const snake of current.snakes) {
            const before = prev.snakes.find((s) => s.seat === snake.seat);
            if (before && snake.length > before.length && snake.alive) {
              spawnBurst(particlesRef.current, snake.segments[0], seatColors[snake.seat % seatColors.length], now, 10, 4, 450);
            }
          }
        }
        const mySnake = current.snakes.find((s) => s.seat === mySeatIndex);
        if (mySnake?.alive) {
          const confirmed = mySnake.segments[0];
          // The error is measured against what was actually on screen last frame (predicted +
          // any not-yet-decayed error), not the raw predicted position — that's what makes the
          // rendered head continuous across this reset rather than merely close to continuous.
          if (predictedHeadRef.current) {
            const renderedX = predictedHeadRef.current.x + headErrorRef.current.x;
            const renderedY = predictedHeadRef.current.y + headErrorRef.current.y;
            const ex = renderedX - confirmed.x;
            const ey = renderedY - confirmed.y;
            headErrorRef.current =
              Math.abs(ex) > HEAD_RECONCILE_SNAP_CELLS || Math.abs(ey) > HEAD_RECONCILE_SNAP_CELLS
                ? { x: 0, y: 0 } // implausibly large — a reconnect/resume, not a normal misprediction
                : { x: ex, y: ey };
          } else {
            headErrorRef.current = { x: 0, y: 0 };
          }
          predictedHeadRef.current = { x: confirmed.x, y: confirmed.y };
          predictedProgressRef.current = 0;
        } else {
          predictedHeadRef.current = null;
          predictedProgressRef.current = 0;
          headErrorRef.current = { x: 0, y: 0 };
        }
        lastProcessedTickRef.current = current.tick;
      }
      // Advance my own predicted head every frame using the freshest requested direction —
      // this is what makes a turn appear the instant it's pressed instead of waiting for the
      // next server round trip. The step is `tBody` minus however much of this tick's 1-cell
      // allowance has already been walked, so total movement per tick is capped at exactly what
      // the body's own clamped clock allows — the head can no longer outrun a late tick the way
      // an unclamped per-frame accumulator could. Any residual reconciliation error is eased out
      // of `headErrorRef` on the same clock, rather than being applied as an instant snap.
      if (predictedHeadRef.current) {
        const step = tBody - predictedProgressRef.current;
        if (step > 0) {
          const v = VECTORS[myDirectionRef.current];
          predictedHeadRef.current = {
            x: predictedHeadRef.current.x + v.x * step,
            y: predictedHeadRef.current.y + v.y * step,
          };
          predictedProgressRef.current = tBody;
        }
        const decay = Math.pow(0.5, dt / HEAD_RECONCILE_HALF_LIFE_MS);
        headErrorRef.current = { x: headErrorRef.current.x * decay, y: headErrorRef.current.y * decay };
      }
      // Death bursts + a screen-shake if it's my own elimination.
      while (processedDeathCountRef.current < deathsRef.current.length) {
        const death = deathsRef.current[processedDeathCountRef.current];
        processedDeathCountRef.current += 1;
        const snake = current.snakes.find((s) => s.seat === death.seat);
        if (snake) {
          spawnBurst(particlesRef.current, snake.segments[0], seatColors[death.seat % seatColors.length], now, 18, 6, 600);
          if (death.seat === mySeatIndex) shakeRef.current.amount = 8;
        }
      }

      // Ease the visible shrink boundary toward its real target — makes the shrink read as
      // a slow closing-in rather than a sudden jump every ~6s.
      const targetBounds = current.arenaBounds;
      if (!visualBoundsRef.current) visualBoundsRef.current = targetBounds;
      const k = 1 - Math.pow(0.0005, dt / 1000);
      visualBoundsRef.current = {
        minX: lerp(visualBoundsRef.current.minX, targetBounds.minX, k),
        minY: lerp(visualBoundsRef.current.minY, targetBounds.minY, k),
        maxX: lerp(visualBoundsRef.current.maxX, targetBounds.maxX, k),
        maxY: lerp(visualBoundsRef.current.maxY, targetBounds.maxY, k),
      };

      shakeRef.current.amount *= 0.85;
      const shakeX = (Math.random() - 0.5) * shakeRef.current.amount;
      const shakeY = (Math.random() - 0.5) * shakeRef.current.amount;

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Background vignette + the cached grid, blitted in one draw instead of re-stroked.
      const vignette = ctx.createRadialGradient(
        canvasSize / 2, canvasSize / 2, canvasSize * 0.12,
        canvasSize / 2, canvasSize / 2, canvasSize * 0.72,
      );
      vignette.addColorStop(0, surfaceMuted || bg);
      vignette.addColorStop(1, bg);
      ctx.fillStyle = vignette;
      ctx.fillRect(-4, -4, canvasSize + 8, canvasSize + 8);
      ctx.drawImage(gridCacheRef.current.canvas, 0, 0, canvasSize, canvasSize);

      // Shrink-zone overlay (danger margin outside the current playable bounds).
      const vb = visualBoundsRef.current;
      const left = vb.minX * cellSize;
      const top = vb.minY * cellSize;
      const right = (vb.maxX + 1) * cellSize;
      const bottom = (vb.maxY + 1) * cellSize;
      ctx.fillStyle = dangerSoft || danger;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(0, 0, canvasSize, top);
      ctx.fillRect(0, bottom, canvasSize, canvasSize - bottom);
      ctx.fillRect(0, top, left, bottom - top);
      ctx.fillRect(right, top, canvasSize - right, bottom - top);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = danger;
      ctx.lineWidth = 2;
      ctx.strokeRect(left, top, right - left, bottom - top);

      // Pickups — a glowing orb (radial falloff + a bright core) instead of a flat dot,
      // still gently pulsing.
      const pulse = 0.75 + Math.sin(now / 220) * 0.25;
      for (const p of current.pickups) {
        const cx = (p.x + 0.5) * cellSize;
        const cy = (p.y + 0.5) * cellSize;
        const r = cellSize * 0.34 * pulse;
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        glow.addColorStop(0, accent);
        glow.addColorStop(0.55, accent);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.arc(cx, cy, cellSize * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const snake of current.snakes) {
        const color = seatColors[snake.seat % seatColors.length];
        const isMine = snake.seat === mySeatIndex;
        const prevSnake = prev?.snakes.find((s) => s.seat === snake.seat);
        const segs = snake.segments.map((seg, i) => {
          const a = prevSnake?.segments[i] ?? seg;
          return { x: lerp(a.x, seg.x, tBody), y: lerp(a.y, seg.y, tBody) };
        });
        if (isMine && predictedHeadRef.current && segs.length) {
          segs[0] = {
            x: predictedHeadRef.current.x + headErrorRef.current.x,
            y: predictedHeadRef.current.y + headErrorRef.current.y,
          };
        }
        drawSnake(ctx, segs, cellSize, color, snake.alive, isMine);
      }

      updateAndDrawParticles(ctx, particlesRef.current, now, cellSize);
      ctx.restore();
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize, roundStart, mySeatIndex]);

  const seatEntries = [...room.members]
    .filter((m) => m.seatIndex !== null)
    .sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0));
  const latestSnakes: SnakeSnapshotEntry[] = bufferRef.current.current?.snakes ?? roundStart?.snakes ?? [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 py-6">
      <div className="flex flex-wrap justify-center gap-3">
        {seatEntries.map((member) => {
          const seatIndex = member.seatIndex ?? 0;
          const live = latestSnakes.find((s) => s.seat === seatIndex);
          const alive = live?.alive ?? true;
          const isMine = seatIndex === mySeatIndex;
          return (
            <div
              key={member.id}
              className={cn(
                'flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition-opacity duration-transition ease-brand',
                isMine ? 'border-brass-400 bg-brass-50' : 'border-ink-200 bg-bone-100',
                !alive && 'opacity-40 grayscale',
              )}
            >
              <span
                className="h-6 w-6 flex-shrink-0 rounded-full"
                style={{ backgroundColor: `var(${SEAT_COLOR_VARS[seatIndex % SEAT_COLOR_VARS.length]})` }}
              />
              <span className="text-xs font-medium text-ink-900">{isMine ? 'You' : member.displayName}</span>
              {member.isBot && <Bot size={11} className="text-ink-400" />}
              <span className="text-[11px] tabular-nums text-ink-400">{live?.length ?? ''}</span>
            </div>
          );
        })}
      </div>

      <div ref={containerRef} className="relative w-full max-w-[560px]">
        <canvas
          ref={canvasRef}
          className="mx-auto block rounded-lg border border-ink-200 shadow-sm"
          style={{ touchAction: 'none' }}
        />

        <AnimatePresence>
          {roundBanner !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={motionTransition(reduce, springs.snappy)}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <span className="rounded-md bg-ink-950/70 px-4 py-2 font-display text-2xl text-bone-50">
                Round {roundBanner}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {roundEnd && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={motionTransition(reduce, springs.snappy)}
              className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded-md border border-brass-300 bg-brass-50 px-4 py-2 text-sm font-medium text-brass-800 shadow-sm"
            >
              {roundEnd.winnerSeat !== null
                ? `${seatEntries.find((s) => s.seatIndex === roundEnd.winnerSeat)?.displayName ?? 'A player'} won round ${roundEnd.roundNumber}`
                : `Round ${roundEnd.roundNumber} ended in a draw`}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DPad onPress={requestDirection} />
      <p className="text-center text-xs text-ink-400">Arrow keys or WASD to steer · grab the glowing dots to grow</p>
    </div>
  );
}

function DPad({ onPress }: { onPress: (dir: Direction) => void }) {
  const btn = 'flex h-10 w-10 items-center justify-center rounded-md border border-ink-200 bg-bone-100 text-ink-600 active:scale-95 active:bg-ink-100 transition-transform duration-press ease-brand select-none';
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1 sm:hidden">
      <div />
      <button type="button" className={btn} onClick={() => onPress('up')} aria-label="Steer up">
        ↑
      </button>
      <div />
      <button type="button" className={btn} onClick={() => onPress('left')} aria-label="Steer left">
        ←
      </button>
      <div />
      <button type="button" className={btn} onClick={() => onPress('right')} aria-label="Steer right">
        →
      </button>
      <div />
      <button type="button" className={btn} onClick={() => onPress('down')} aria-label="Steer down">
        ↓
      </button>
      <div />
    </div>
  );
}

function drawSnake(
  ctx: CanvasRenderingContext2D,
  segments: GridPoint[],
  cellSize: number,
  color: string,
  alive: boolean,
  isMine: boolean,
): void {
  ctx.globalAlpha = alive ? 1 : 0.25;
  const pad = cellSize * 0.08;
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    const shade = i === 0 ? 1 : 0.82 - Math.min(0.35, i * 0.012);
    ctx.fillStyle = shadeColor(color, shade);
    const x = seg.x * cellSize + pad;
    const y = seg.y * cellSize + pad;
    const size = cellSize - pad * 2;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, size, size, i === 0 ? size * 0.4 : size * 0.3);
    } else {
      ctx.rect(x, y, size, size);
    }
    // Soft glow on the head only — cheap (one shadowed fill per snake per frame) and it's
    // what makes the head read as the "live" end of the snake against the rest of the body.
    if (i === 0 && alive) {
      ctx.shadowColor = color;
      ctx.shadowBlur = isMine ? 16 : 9;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    if (isMine && i === 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  // Eyes on the head, oriented toward the neck-to-head direction.
  if (segments.length >= 2 && alive) {
    const head = segments[0];
    const neck = segments[1];
    const dx = head.x - neck.x || 0;
    const dy = head.y - neck.y || 0;
    const cx = (head.x + 0.5) * cellSize;
    const cy = (head.y + 0.5) * cellSize;
    const off = cellSize * 0.18;
    const perpX = -dy * off;
    const perpY = dx * off;
    ctx.fillStyle = 'rgba(20,18,14,0.85)';
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + dx * off + perpX * sign, cy + dy * off + perpY * sign, cellSize * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function updateAndDrawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], now: number, cellSize: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const age = now - p.createdAt;
    if (age > p.life) {
      particles.splice(i, 1);
      continue;
    }
    const t = age / p.life;
    const x = (p.x + (p.vx * age) / 1000) * cellSize;
    const y = (p.y + (p.vy * age) / 1000) * cellSize;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(x, y, p.size * (1 - t * 0.4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Darkens/lightens a resolved CSS color by drawing it through a translucent black overlay —
 *  works regardless of whether the resolved string is hex or hsl(), unlike parsing channels
 *  manually. `shade` of 1 = full color, less = darker (used for the body-to-tail gradient). */
function shadeColor(color: string, shade: number): string {
  if (shade >= 0.999) return color;
  const alpha = clamp(1 - shade, 0, 0.55);
  return `color-mix(in srgb, ${color}, black ${Math.round(alpha * 100)}%)`;
}
