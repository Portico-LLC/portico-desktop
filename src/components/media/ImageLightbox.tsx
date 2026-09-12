import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAttachmentUrl, fetchDownloadUrl, formatBytes } from './useAttachmentUrl';
import type { ChatAttachment } from '@/lib/types';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

interface ImageLightboxProps {
  apiBase: string;
  /** Every image in the conversation, so the arrow keys can walk the whole set rather than
   *  just the message that was clicked. */
  images: ChatAttachment[];
  startIndex: number;
  onClose: () => void;
}

export function ImageLightbox({ apiBase, images, startIndex, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const current = images[index];
  const { data: url, isLoading } = useAttachmentUrl(apiBase, current?.id ?? null);

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => {
        const next = i + delta;
        if (next < 0 || next >= images.length) return i;
        return next;
      });
      // A new image always starts fitted; carrying zoom across would land the viewer
      // somewhere arbitrary in a differently-sized picture.
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    },
    [images.length],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight') go(1);
      else if (event.key === 'ArrowLeft') go(-1);
      else if (event.key === '+' || event.key === '=') setZoom((z) => Math.min(z + 0.5, MAX_ZOOM));
      else if (event.key === '-') setZoom((z) => Math.max(z - 0.5, MIN_ZOOM));
    };
    window.addEventListener('keydown', onKey);
    // The page behind must not scroll while the overlay owns the viewport.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [go, onClose]);

  useEffect(() => {
    if (zoom === 1) setOffset({ x: 0, y: 0 });
  }, [zoom]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (zoom === 1) return;
    dragState.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
    (event.target as Element).setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragState.current;
    if (!drag) return;
    setOffset({ x: drag.ox + (event.clientX - drag.x), y: drag.oy + (event.clientY - drag.y) });
  };

  const endDrag = () => { dragState.current = null; };

  const download = async () => {
    if (!current) return;
    const link = await fetchDownloadUrl(apiBase, current.id);
    window.open(link, '_blank');
  };

  if (!current) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
        className="fixed inset-0 z-[200] flex flex-col bg-ink-950/95"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={current.filename}
      >
        <div
          className="flex items-center justify-between gap-4 px-4 py-3 text-bone-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{current.filename}</p>
            <p className="text-[11px] text-bone-50/60">
              {formatBytes(current.sizeBytes)}
              {images.length > 1 && ` · ${index + 1} of ${images.length}`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(z - 0.5, MIN_ZOOM))}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
              className="rounded-sm p-2 hover:bg-bone-50/10 disabled:opacity-40"
            >
              <ZoomOut size={18} />
            </button>
            <span className="w-12 text-center font-mono text-[11px] tabular-nums text-bone-50/70">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(z + 0.5, MAX_ZOOM))}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
              className="rounded-sm p-2 hover:bg-bone-50/10 disabled:opacity-40"
            >
              <ZoomIn size={18} />
            </button>
            <button type="button" onClick={download} aria-label="Download" className="rounded-sm p-2 hover:bg-bone-50/10">
              <Download size={18} />
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-sm p-2 hover:bg-bone-50/10">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
          {index > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); go(-1); }}
              aria-label="Previous image"
              className="absolute left-3 z-10 rounded-full bg-ink-950/70 p-2.5 text-bone-50 hover:bg-ink-950"
            >
              <ChevronLeft size={22} />
            </button>
          )}

          {isLoading || !url ? (
            <Loader2 className="h-8 w-8 animate-spin text-bone-50/70" />
          ) : (
            <img
              src={url}
              alt={current.filename}
              draggable={false}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onDoubleClick={() => setZoom((z) => (z === 1 ? 2 : 1))}
              className={cn(
                'max-h-full max-w-full select-none object-contain',
                zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in',
              )}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transition: dragState.current ? 'none' : 'transform 180ms cubic-bezier(0.2, 0, 0, 1)',
              }}
            />
          )}

          {index < images.length - 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); go(1); }}
              aria-label="Next image"
              className="absolute right-3 z-10 rounded-full bg-ink-950/70 p-2.5 text-bone-50 hover:bg-ink-950"
            >
              <ChevronRight size={22} />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
