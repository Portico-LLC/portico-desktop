import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Eraser, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DoodleStrokePayload, DoodleTool, NormalizedPoint } from '@/lib/types';

const PALETTE = ['#1C1B17', '#B4543A', '#A86E1D', '#557040', '#547085', '#B77B33', '#F6F4EF'];
const WIDTHS = [3, 6, 12];

export interface DoodleCanvasHandle {
  /** Draws a stroke relayed from the socket — never called for strokes this canvas
   *  originated itself (the parent filters those out, since they're already drawn locally). */
  drawRemoteStroke: (payload: DoodleStrokePayload) => void;
  clear: () => void;
}

interface DoodleCanvasProps {
  interactive: boolean;
  onLocalStroke?: (payload: { strokeId: string; phase: 'start' | 'move' | 'end'; point?: NormalizedPoint; color?: string; width?: number; tool?: DoodleTool }) => void;
  onLocalClear?: () => void;
}

function surfaceColor(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#ffffff';
}

export const DoodleCanvas = forwardRef<DoodleCanvasHandle, DoodleCanvasProps>(function DoodleCanvas(
  { interactive, onLocalStroke, onLocalClear },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeStrokesRef = useRef<Map<string, NormalizedPoint>>(new Map());
  const drawingRef = useRef(false);
  const currentStrokeIdRef = useRef<string | null>(null);
  const [color, setColor] = useState(PALETTE[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [tool, setTool] = useState<DoodleTool>('pen');
  const [size, setSize] = useState({ w: 560, h: 380 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 560;
      setSize({ w: Math.floor(w), h: Math.floor(w * 0.68) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    // Resizing a canvas element clears its bitmap — snapshot and restore so an in-progress
    // drawing survives a window/container resize mid-round.
    const prev = canvas.width > 0 ? canvas.toDataURL() : null;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = surfaceColor();
    ctx.fillRect(0, 0, size.w, size.h);
    if (prev && prev !== 'data:,') {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, size.w, size.h);
      img.src = prev;
    }
  }, [size]);

  const drawSegment = (from: NormalizedPoint, to: NormalizedPoint, strokeColor: string, strokeWidth: number, strokeTool: DoodleTool) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = strokeTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = strokeTool === 'eraser' ? 'rgba(0,0,0,1)' : strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x * size.w, from.y * size.h);
    ctx.lineTo(to.x * size.w, to.y * size.h);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  };

  const drawDot = (p: NormalizedPoint, strokeColor: string, strokeWidth: number, strokeTool: DoodleTool) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = strokeTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.fillStyle = strokeTool === 'eraser' ? 'rgba(0,0,0,1)' : strokeColor;
    ctx.beginPath();
    ctx.arc(p.x * size.w, p.y * size.h, strokeWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.fillStyle = surfaceColor();
    ctx.fillRect(0, 0, size.w, size.h);
    activeStrokesRef.current.clear();
  };

  useImperativeHandle(ref, () => ({
    drawRemoteStroke: (payload) => {
      const strokeColor = payload.color ?? PALETTE[0];
      const strokeWidth = payload.width ?? WIDTHS[1];
      const strokeTool = payload.tool ?? 'pen';
      if (payload.phase === 'start' && payload.point) {
        activeStrokesRef.current.set(payload.strokeId, payload.point);
        drawDot(payload.point, strokeColor, strokeWidth, strokeTool);
      } else if (payload.phase === 'move' && payload.point) {
        const last = activeStrokesRef.current.get(payload.strokeId);
        if (last) drawSegment(last, payload.point, strokeColor, strokeWidth, strokeTool);
        activeStrokesRef.current.set(payload.strokeId, payload.point);
      } else if (payload.phase === 'end') {
        activeStrokesRef.current.delete(payload.strokeId);
      }
    },
    clear: clearCanvas,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [size]);

  const getNormalizedPoint = (e: ReactPointerEvent<HTMLCanvasElement>): NormalizedPoint => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = getNormalizedPoint(e);
    const strokeId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    currentStrokeIdRef.current = strokeId;
    drawingRef.current = true;
    activeStrokesRef.current.set(strokeId, p);
    drawDot(p, color, width, tool);
    onLocalStroke?.({ strokeId, phase: 'start', point: p, color, width, tool });
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!interactive || !drawingRef.current || !currentStrokeIdRef.current) return;
    const strokeId = currentStrokeIdRef.current;
    const p = getNormalizedPoint(e);
    const last = activeStrokesRef.current.get(strokeId);
    if (last) drawSegment(last, p, color, width, tool);
    activeStrokesRef.current.set(strokeId, p);
    onLocalStroke?.({ strokeId, phase: 'move', point: p, color, width, tool });
  };

  const handlePointerUp = () => {
    if (!interactive || !drawingRef.current || !currentStrokeIdRef.current) return;
    const strokeId = currentStrokeIdRef.current;
    activeStrokesRef.current.delete(strokeId);
    drawingRef.current = false;
    onLocalStroke?.({ strokeId, phase: 'end' });
    currentStrokeIdRef.current = null;
  };

  const handleClearClick = () => {
    clearCanvas();
    onLocalClear?.();
  };

  return (
    <div className="flex flex-col gap-3">
      {interactive && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-ink-200 bg-bone-100 p-2">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setColor(c);
                setTool('pen');
              }}
              className={cn(
                'h-6 w-6 flex-shrink-0 rounded-full border-2 transition-transform duration-hover ease-brand hover:scale-110',
                color === c && tool === 'pen' ? 'scale-110 border-brass-500' : 'border-ink-300',
              )}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
          <div className="mx-1 h-6 w-px bg-ink-200" />
          {WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWidth(w)}
              className={cn(
                'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border transition-colors duration-hover ease-brand',
                width === w ? 'border-brass-500 bg-brass-50' : 'border-ink-200 hover:bg-ink-50',
              )}
              aria-label={`Brush size ${w}`}
            >
              <span className="rounded-full bg-ink-700" style={{ width: w * 0.7, height: w * 0.7 }} />
            </button>
          ))}
          <div className="mx-1 h-6 w-px bg-ink-200" />
          <button
            type="button"
            onClick={() => setTool('eraser')}
            className={cn(
              'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border transition-colors duration-hover ease-brand',
              tool === 'eraser' ? 'border-brass-500 bg-brass-50 text-brass-700' : 'border-ink-200 text-ink-500 hover:bg-ink-50',
            )}
            aria-label="Eraser"
          >
            <Eraser size={14} />
          </button>
          <button
            type="button"
            onClick={handleClearClick}
            className="ml-auto flex h-7 flex-shrink-0 items-center gap-1 rounded-md border border-ink-200 px-2 text-xs text-ink-500 transition-colors duration-hover ease-brand hover:border-terracotta-300 hover:bg-terracotta-50 hover:text-terracotta-600"
          >
            <Trash2 size={12} />
            Clear
          </button>
        </div>
      )}
      <div ref={containerRef} className="w-full">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={cn(
            'block rounded-lg border border-ink-200 shadow-sm',
            interactive ? 'touch-none cursor-crosshair' : 'cursor-default',
          )}
        />
      </div>
    </div>
  );
});
