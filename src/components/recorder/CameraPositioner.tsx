import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Circle, RectangleHorizontal, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CameraPosition, CameraShape } from '@/lib/recorder/types';

interface CameraPositionerProps {
  shape: CameraShape;
  position: CameraPosition;
  onShapeChange: (shape: CameraShape) => void;
  onPositionChange: (position: CameraPosition) => void;
}

const SHAPE_OPTIONS: { id: CameraShape; label: string; icon: typeof Square }[] = [
  { id: 'rect', label: 'Rectangle', icon: RectangleHorizontal },
  { id: 'square', label: 'Square', icon: Square },
  { id: 'circle', label: 'Circle', icon: Circle },
];

const BUBBLE_SIZE_PCT = 22;

export function CameraPositioner({ shape, position, onShapeChange, onPositionChange }: CameraPositionerProps) {
  const mockScreenRef = useRef<HTMLDivElement>(null);

  const updateFromPointer = (clientX: number, clientY: number) => {
    const el = mockScreenRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const bubblePx = (rect.width * BUBBLE_SIZE_PCT) / 100;
    const range = Math.max(1, rect.width - bubblePx);
    const rangeY = Math.max(1, rect.height - bubblePx);
    const xPct = Math.min(1, Math.max(0, (clientX - rect.left - bubblePx / 2) / range));
    const yPct = Math.min(1, Math.max(0, (clientY - rect.top - bubblePx / 2) / rangeY));
    onPositionChange({ xPct, yPct });
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX, e.clientY);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (e.buttons !== 1) return;
    updateFromPointer(e.clientX, e.clientY);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        {SHAPE_OPTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            title={label}
            onClick={() => onShapeChange(id)}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-xs font-medium transition-colors duration-hover ease-brand',
              shape === id
                ? 'border-pine-700 bg-pine-800 text-bone-50'
                : 'border-ink-300 text-ink-600 hover:bg-ink-100',
            )}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      <div
        ref={mockScreenRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        className="relative aspect-video w-full cursor-crosshair overflow-hidden rounded-md border border-ink-200 bg-ink-800"
      >
        <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-xs text-ink-400">
          Your screen
        </p>
        <div
          className={cn(
            'absolute flex items-center justify-center border-2 border-bone-50 bg-pine-600/80 text-bone-50 shadow-md',
            shape === 'circle' ? 'rounded-full' : shape === 'square' ? 'rounded-md' : 'rounded-md',
          )}
          style={{
            width: `${BUBBLE_SIZE_PCT}%`,
            height: shape === 'rect' ? `${BUBBLE_SIZE_PCT * 0.75}%` : `${BUBBLE_SIZE_PCT}%`,
            left: `calc(${position.xPct * (100 - BUBBLE_SIZE_PCT)}%)`,
            top: `calc(${position.yPct * (100 - BUBBLE_SIZE_PCT)}%)`,
          }}
        >
          <span className="text-[10px]">Drag me</span>
        </div>
      </div>
      <p className="text-xs text-ink-400">Drag the camera bubble to where you want it before you start recording.</p>
    </div>
  );
}
