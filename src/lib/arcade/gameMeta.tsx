import { Bomb, Palette, Swords } from 'lucide-react';
import type { GameType } from '@/lib/types';

export interface GameMeta {
  label: string;
  tagline: string;
  icon: React.ReactNode;
  minPlayers: number;
  available: boolean;
}

/** Snake Royale and Doodle Relay are modeled end-to-end (schema, lobby, protocol) but their
 *  engines ship in later phases — `available: false` keeps them visible-but-disabled in the
 *  game picker rather than hidden, so the room a host is about to get isn't a mystery. */
export const GAME_META: Record<GameType, GameMeta> = {
  word_bomb: {
    label: 'Word Bomb',
    tagline: 'Type a word before the fuse burns out.',
    icon: <Bomb size={20} />,
    minPlayers: 2,
    available: true,
  },
  snake_royale: {
    label: 'Snake Royale',
    tagline: 'Last snake alive wins — the arena shrinks as you go.',
    icon: <Swords size={20} />,
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
};
