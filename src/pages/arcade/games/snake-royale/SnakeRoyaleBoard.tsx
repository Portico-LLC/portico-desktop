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
  // lastProcessedTickRef.current` block below), so drift can never exceed one tick's worth of
  // movement and any authoritative correction (collision, growth, a rejected move) self-heals
  // within ~1 tick without a visible snap in the common case.
  const predictedHeadRef = useRef<GridPoint | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const visualBoundsRef = useRef<ArenaBounds | null>(null);
  const lastFrameAtRef = useRef<number>(performance.now());
  const lastProcessedTickRef = useRef(-1);
  const processedDeathCountRef = useRef(0);
  const shakeRef = useRef({ amount: 0 });
  const rafRef = useRef<number | null>(null);

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
      const styles = getComputedStyle(document.documentElement);
      const bg = styles.getPropertyValue('--surface').trim();
      const gridLine = styles.getPropertyValue('--border').trim();
      const danger = styles.getPropertyValue('--danger').trim();
      const dangerSoft = styles.getPropertyValue('--danger-soft').trim();
      const accent = styles.getPropertyValue('--accent').trim();

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
        predictedHeadRef.current = mySnake?.alive
          ? { x: mySnake.segments[0].x, y: mySnake.segments[0].y }
          : null;
        lastProcessedTickRef.current = current.tick;
      }
      // Advance my own predicted head every frame using the freshest requested direction —
      // this is what makes a turn appear the instant it's pressed instead of waiting for the
      // next server round trip. Re-anchored every tick above, so it never drifts by more than
      // one tick's worth of movement from the server's truth.
      if (predictedHeadRef.current) {
        const v = VECTORS[myDirectionRef.current];
        const cellsPerMs = 1 / tickMs;
        predictedHeadRef.current = {
          x: predictedHeadRef.current.x + v.x * cellsPerMs * dt,
          y: predictedHeadRef.current.y + v.y * cellsPerMs * dt,
        };
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

      // Background + grid.
      ctx.fillStyle = bg;
      ctx.fillRect(-4, -4, canvasSize + 8, canvasSize + 8);
      ctx.strokeStyle = gridLine;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, canvasSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(canvasSize, i * cellSize);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

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

      // Pickups — gentle pulse.
      const pulse = 0.75 + Math.sin(now / 220) * 0.25;
      ctx.fillStyle = accent;
      for (const p of current.pickups) {
        ctx.beginPath();
        ctx.arc((p.x + 0.5) * cellSize, (p.y + 0.5) * cellSize, cellSize * 0.22 * pulse, 0, Math.PI * 2);
        ctx.fill();
      }

      // Interpolation/extrapolation fraction for this frame.
      const t = clamp((now - current.receivedAt) / tickMs, 0, 1.5);
      const tBody = Math.min(t, 1);

      for (const snake of current.snakes) {
        const color = seatColors[snake.seat % seatColors.length];
        const isMine = snake.seat === mySeatIndex;
        const prevSnake = prev?.snakes.find((s) => s.seat === snake.seat);
        const segs = snake.segments.map((seg, i) => {
          const a = prevSnake?.segments[i] ?? seg;
          return { x: lerp(a.x, seg.x, tBody), y: lerp(a.y, seg.y, tBody) };
        });
        if (isMine && predictedHeadRef.current && segs.length) {
          segs[0] = { x: predictedHeadRef.current.x, y: predictedHeadRef.current.y };
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
    ctx.fill();
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
