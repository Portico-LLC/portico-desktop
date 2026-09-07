import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { cn } from '@/lib/utils';
import type { ChessColor } from '@/lib/types';
import { ChessPromotionModal } from './ChessPromotionModal';
import { ChessPieceIcon } from './ChessPieceIcon';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

// Fixed hex, not theme-variable Tailwind classes: a chessboard is a physical-object metaphor
// that should look the same in light or dark app theme — like a real board doesn't change
// color when you turn off the room lights. Also guarantees piece/board contrast is never at
// the mercy of a semantic token shifting under `[data-theme="dark"]`.
const SQUARE_LIGHT = '#EDE4D3';
const SQUARE_DARK = '#3E6B56';

interface PendingPromotion {
  from: Square;
  to: Square;
  color: ChessColor;
}

interface ChessBoardProps {
  fen: string;
  /** null while spectating (or before seats are known) — the board just renders unflipped. */
  myColor: ChessColor | null;
  lastMove?: { from: string; to: string } | null;
  inCheck: boolean;
  /** False when it isn't my turn, the game is over, or I'm not a player in this game. */
  interactive: boolean;
  onMove: (from: string, to: string, promotion?: string) => void;
}

/** A DOM/CSS-Grid board (not canvas) — chess needs crisp glyphs at any zoom, native
 *  drag-and-drop, and simple per-square hit targets, which a discrete 8x8 grid of elements
 *  serves far better than a pixel surface. `aspect-square` + a `max-width` gives a fluid,
 *  always-square board with zero JS/ResizeObserver needed. Square colors are plain Tailwind
 *  classes (on-brand Pine/Bone, not chess-cliché brown/tan) that repaint for free on a theme
 *  toggle via the CSS custom properties they reference — no MutationObserver needed here
 *  either, unlike the canvas-based games elsewhere in the Arcade. */
export function ChessBoard({ fen, myColor, lastMove, inCheck, interactive, onMove }: ChessBoardProps) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);

  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const board = chess.board();
  const turn = chess.turn();
  const flipped = myColor === 'b';
  const files = flipped ? [...FILES].reverse() : FILES;
  const ranks = flipped ? [...RANKS].reverse() : RANKS;

  const legalTargets = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(chess.moves({ square: selected, verbose: true }).map((m) => m.to));
  }, [chess, selected]);

  const kingInCheckSquare = useMemo(() => {
    if (!inCheck) return null;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = board[r][f];
        if (sq?.type === 'k' && sq.color === turn) return `${FILES[f]}${8 - r}`;
      }
    }
    return null;
  }, [board, inCheck, turn]);

  function pieceAt(square: string) {
    const file = square.charCodeAt(0) - 97;
    const rank = 8 - Number(square[1]);
    return board[rank]?.[file] ?? null;
  }

  function attemptMove(from: Square, to: Square) {
    const piece = pieceAt(from);
    setSelected(null);
    if (piece?.type === 'p' && (to.endsWith('8') || to.endsWith('1'))) {
      setPendingPromotion({ from, to, color: piece.color });
      return;
    }
    onMove(from, to);
  }

  function handleSquareClick(square: Square) {
    if (!interactive) return;
    const piece = pieceAt(square);

    if (selected) {
      if (selected === square) {
        setSelected(null);
        return;
      }
      if (legalTargets.has(square)) {
        attemptMove(selected, square);
        return;
      }
      setSelected(piece && piece.color === myColor ? square : null);
      return;
    }

    if (piece && piece.color === myColor && piece.color === turn) setSelected(square);
  }

  function handleDragStart(square: Square, e: DragEvent) {
    if (!interactive) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', square);
    e.dataTransfer.effectAllowed = 'move';
    setSelected(square);
  }

  function handleDrop(square: Square, e: DragEvent) {
    e.preventDefault();
    const from = e.dataTransfer.getData('text/plain') as Square;
    if (!from || !interactive) return;
    const piece = pieceAt(from);
    if (!piece || piece.color !== myColor || piece.color !== turn) return;
    if (!chess.moves({ square: from, verbose: true }).some((m) => m.to === square)) {
      setSelected(null);
      return;
    }
    attemptMove(from, square);
  }

  return (
    <div className="mx-auto w-full max-w-[560px] select-none">
      <div className="grid aspect-square grid-cols-8 grid-rows-8 overflow-hidden rounded-md border border-ink-300 shadow-sm">
        {ranks.map((rank, rankIdx) =>
          files.map((file, fileIdx) => {
            const square = `${file}${rank}` as Square;
            const piece = pieceAt(square);
            const isDark = (fileIdx + rankIdx) % 2 === 1;
            const isSelected = selected === square;
            const isLegalTarget = legalTargets.has(square);
            const isLastMove = !!lastMove && (lastMove.from === square || lastMove.to === square);
            const isCheckSquare = kingInCheckSquare === square;
            const canDrag = interactive && !!piece && piece.color === myColor && piece.color === turn;

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                onDragOver={(e) => interactive && e.preventDefault()}
                onDrop={(e) => handleDrop(square, e)}
                style={{ backgroundColor: isDark ? SQUARE_DARK : SQUARE_LIGHT }}
                className={cn('relative flex items-center justify-center', interactive && 'cursor-pointer')}
              >
                {isLastMove && <div className="pointer-events-none absolute inset-0 bg-brass-400/30" />}
                {isCheckSquare && <div className="pointer-events-none absolute inset-0 bg-terracotta-500/45" />}
                {isSelected && <div className="pointer-events-none absolute inset-0 ring-[3px] ring-inset ring-brass-500" />}
                {isLegalTarget && !piece && <div className="pointer-events-none absolute h-[28%] w-[28%] rounded-full bg-ink-900/25" />}
                {isLegalTarget && piece && <div className="pointer-events-none absolute inset-0 ring-[3px] ring-inset ring-ink-900/30" />}

                {piece && (
                  <span
                    draggable={canDrag}
                    onDragStart={(e) => handleDragStart(square, e)}
                    className={cn(
                      'pointer-events-none flex h-full w-full select-none items-center justify-center',
                      canDrag && 'pointer-events-auto cursor-grab active:cursor-grabbing',
                    )}
                  >
                    <ChessPieceIcon type={piece.type} color={piece.color} className="h-[78%] w-[78%] drop-shadow-sm" />
                  </span>
                )}

                {fileIdx === 0 && (
                  <span
                    className="pointer-events-none absolute left-0.5 top-0.5 text-[9px] font-semibold"
                    style={{ color: isDark ? 'rgba(250,248,243,0.55)' : 'rgba(28,27,23,0.4)' }}
                  >
                    {rank}
                  </span>
                )}
                {rankIdx === 7 && (
                  <span
                    className="pointer-events-none absolute bottom-0.5 right-0.5 text-[9px] font-semibold"
                    style={{ color: isDark ? 'rgba(250,248,243,0.55)' : 'rgba(28,27,23,0.4)' }}
                  >
                    {file}
                  </span>
                )}
              </div>
            );
          }),
        )}
      </div>

      {pendingPromotion && (
        <ChessPromotionModal
          color={pendingPromotion.color}
          onChoose={(piece) => {
            onMove(pendingPromotion.from, pendingPromotion.to, piece);
            setPendingPromotion(null);
          }}
          onCancel={() => setPendingPromotion(null)}
        />
      )}
    </div>
  );
}
