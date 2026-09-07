import type { ChessColor } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ChessPieceIcon } from './ChessPieceIcon';

const PROMOTION_PIECES: { id: 'q' | 'r' | 'b' | 'n'; label: string }[] = [
  { id: 'q', label: 'Queen' },
  { id: 'r', label: 'Rook' },
  { id: 'b', label: 'Bishop' },
  { id: 'n', label: 'Knight' },
];

interface ChessPromotionModalProps {
  color: ChessColor;
  onChoose: (piece: 'q' | 'r' | 'b' | 'n') => void;
  onCancel: () => void;
}

export function ChessPromotionModal({ color, onChoose, onCancel }: ChessPromotionModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-xs rounded-lg border border-ink-200 bg-bone-50 p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-4 text-center text-sm font-medium text-ink-700">Promote your pawn to</p>
        <div className="grid grid-cols-4 gap-2">
          {PROMOTION_PIECES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChoose(p.id)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-md border border-ink-200 bg-bone-100 py-3 transition-colors duration-hover ease-brand',
                'hover:border-brass-400 hover:bg-brass-50',
              )}
              aria-label={p.label}
            >
              <ChessPieceIcon type={p.id} color={color} className="h-8 w-8" />
              <span className="text-[10px] font-medium text-ink-500">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
