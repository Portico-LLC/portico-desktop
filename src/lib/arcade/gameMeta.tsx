import { Bomb, Crown, Palette, HelpCircle } from 'lucide-react';
import type { GameType } from '@/lib/types';

export interface GameMeta {
  label: string;
  tagline: string;
  icon: React.ReactNode;
  minPlayers: number;
  available: boolean;
}

/** Fallback for a `gameType` no longer in `GameType` — e.g. a historical match/room row
 *  for a game that's since been removed from the lineup. Keeps history/results/room views
 *  from throwing on `GAME_META[gameType]` instead of assuming every stored value is current. */
export const UNKNOWN_GAME_META: GameMeta = {
  label: 'Unavailable game',
  tagline: 'This game is no longer available.',
  icon: <HelpCircle size={20} />,
  minPlayers: 2,
  available: false,
};

export const GAME_META: Record<GameType, GameMeta> = {
  word_bomb: {
    label: 'Word Bomb',
    tagline: 'Type a word before the fuse burns out.',
    icon: <Bomb size={20} />,
    minPlayers: 2,
    available: true,
  },
  doodle_relay: {
    label: 'Doodle Relay',
    tagline: 'Draw it, guess it, score points.',
    icon: <Palette size={20} />,
    minPlayers: 2,
    available: true,
  },
  chess: {
    label: 'Chess',
    tagline: 'Classic chess — ranked time controls or a bot.',
    icon: <Crown size={20} />,
    minPlayers: 2,
    available: true,
  },
};
