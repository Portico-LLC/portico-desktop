import type { ReactElement } from 'react';
import type { ChessColor } from '@/lib/types';

export type ChessPieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

// Fixed hex, not theme-variable classes: pieces read as one specific color (a player's side),
// not as themed UI chrome — they must look identical in light and dark app theme, exactly
// like a physical chess set doesn't change color when the room lights change.
export const CHESS_WHITE_FILL = '#FAF8F3';
export const CHESS_WHITE_STROKE = '#1C1B17';
export const CHESS_BLACK_FILL = '#161510';
export const CHESS_BLACK_STROKE = '#FAF8F3';

/**
 * Hand-drawn silhouettes, not font glyphs. Unicode ships a *separate* hollow-outline "white
 * piece" codepoint range (♔♕♖♗♘♙) from the solid "black piece" range (♚♛♜♝♞♟) — most system
 * fonts render the former with almost no fillable interior, so overlaying a light CSS color on
 * top left white pieces unreadable, and different platforms render the glyphs wildly
 * differently (one Windows report showed the black queen as an ornate decorative dingbat
 * instead of a queen). Drawing our own single silhouette per piece type and coloring it
 * entirely via fill/stroke sidesteps all of that — same shape, same rendering, every browser.
 */
export function ChessPieceIcon({ type, color, className }: { type: ChessPieceType; color: ChessColor; className?: string }) {
  const fill = color === 'w' ? CHESS_WHITE_FILL : CHESS_BLACK_FILL;
  const stroke = color === 'w' ? CHESS_WHITE_STROKE : CHESS_BLACK_STROKE;
  const strokeWidth = color === 'w' ? 1.5 : 1;

  return (
    <svg viewBox="0 0 45 45" className={className} aria-hidden focusable="false">
      <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round">
        {PIECE_SHAPE[type]}
      </g>
      {type === 'n' && <circle cx="20" cy="13.3" r="1.2" fill={stroke} stroke="none" />}
    </svg>
  );
}

const PIECE_SHAPE: Record<ChessPieceType, ReactElement> = {
  p: (
    <>
      <circle cx="22.5" cy="12.5" r="6.5" />
      <path d="M16.5 33 C16.5 25 18 21 22.5 21 C27 21 28.5 25 28.5 33 L32 39 H13 Z" />
      <rect x="10" y="39" width="25" height="4" rx="1" />
    </>
  ),
  r: (
    <>
      <rect x="11" y="10" width="4" height="5" />
      <rect x="19" y="10" width="4" height="5" />
      <rect x="27" y="10" width="4" height="5" />
      <rect x="10" y="14" width="25" height="4" />
      <path d="M14 18 L31 18 L29 32 L16 32 Z" />
      <rect x="13" y="32" width="19" height="3" />
      <rect x="10" y="39" width="25" height="4" rx="1" />
    </>
  ),
  n: (
    <path d="M12 39 L12 31 Q12.5 25.5 17 23.5 Q14.5 20.5 15.5 18.5 L17 10 L19 15 L22 8 Q27 10.5 25.5 13 L31 14.5 L37 19.5 L30.5 20.5 Q34 22.5 33 25.5 Q30.5 29.5 29.5 32.5 L33 39 Z" />
  ),
  b: (
    <>
      <circle cx="22.5" cy="8.5" r="2.2" />
      <path d="M22.5 11.5 C26 14 27.5 17.5 26 21 C25.2 22.9 23.7 24 22.5 24.5 C21.3 24 19.8 22.9 19 21 C17.5 17.5 19 14 22.5 11.5 Z" />
      <path d="M17.5 25 C19 26.5 20.5 27 22.5 27 C24.5 27 26 26.5 27.5 25 C28.5 28 27.5 32 25 34.5 L27 39 H18 L20 34.5 C17.5 32 16.5 28 17.5 25 Z" />
      <rect x="13" y="39" width="19" height="4" rx="1" />
    </>
  ),
  q: (
    <>
      <circle cx="12" cy="10" r="2.2" />
      <circle cx="19" cy="7" r="2.2" />
      <circle cx="26" cy="7" r="2.2" />
      <circle cx="33" cy="10" r="2.2" />
      <circle cx="22.5" cy="6.5" r="2.2" />
      <path d="M11 12 L34 12 L31 26 C29 28.5 26 30 22.5 30 C19 30 16 28.5 14 26 Z" />
      <path d="M17 30 C19 31.5 20.7 32 22.5 32 C24.3 32 26 31.5 28 30 C29 33 28 36.5 25.5 39 L19.5 39 C17 36.5 16 33 17 30 Z" />
      <rect x="12" y="39" width="21" height="4" rx="1" />
    </>
  ),
  k: (
    <>
      <line x1="22.5" y1="6" x2="22.5" y2="12" strokeWidth={2} />
      <line x1="19" y1="9" x2="26" y2="9" strokeWidth={2} />
      <path d="M14 14 L31 14 L28.5 27 C26.5 29.5 24.5 30.5 22.5 30.5 C20.5 30.5 18.5 29.5 16.5 27 Z" />
      <path d="M17.5 30.5 C19.5 32 21 32.5 22.5 32.5 C24 32.5 25.5 32 27.5 30.5 C29 33.5 28 37 25.5 39.5 L19.5 39.5 C17 37 16 33.5 17.5 30.5 Z" />
      <rect x="12" y="39.5" width="21" height="3.5" rx="1" />
    </>
  ),
};
