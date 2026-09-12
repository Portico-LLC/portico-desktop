import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, Send } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { seatColor } from '@/lib/arcade/playerColors';
import { motionTransition, springs } from '@/lib/motion/springs';
import { cn } from '@/lib/utils';
import type { GuessFeedEntry } from './useDoodleRelaySocket';

interface GuessPanelProps {
  isArtist: boolean;
  /** Per-word length only — null while the artist is still choosing a prompt. */
  wordLengths: number[] | null;
  myWord: string | null;
  guessFeed: GuessFeedEntry[];
  seatName: (seat: number) => string;
  onGuess: (text: string) => void;
  alreadyCorrect: boolean;
  lastWasWrong: boolean;
}

export function GuessPanel({ isArtist, wordLengths, myWord, guessFeed, seatName, onGuess, alreadyCorrect, lastWasWrong }: GuessPanelProps) {
  const reduce = !!useReducedMotion();
  const [value, setValue] = useState('');
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [guessFeed, reduce]);

  const submit = () => {
    if (!value.trim() || isArtist || alreadyCorrect) return;
    onGuess(value.trim());
    setValue('');
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-ink-200 bg-bone-100">
      <div className="border-b border-ink-200 p-3 text-center">
        {isArtist ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Your word</p>
            <p className="font-display text-2xl text-ink-900">{myWord ?? '…'}</p>
          </>
        ) : (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Guess the word</p>
            {wordLengths ? (
              // One underscore group per drawable word, with a visible gap between groups —
              // e.g. "_ _ _ _ _   _ _ _ _ _ _" for a modifier + noun prompt.
              <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-lg tracking-[0.3em] text-ink-700">
                {wordLengths.map((len, i) => (
                  <span key={i}>{'_ '.repeat(len).trim()}</span>
                ))}
              </p>
            ) : (
              <p className="text-base text-ink-500">The artist is choosing a word…</p>
            )}
          </>
        )}
      </div>

      <div ref={feedRef} className="flex-1 space-y-1.5 overflow-y-auto p-3" style={{ maxHeight: 220 }}>
        {guessFeed.length === 0 && <p className="py-6 text-center text-xs text-ink-400">Guesses will show up here.</p>}
        <AnimatePresence initial={false}>
          {guessFeed.map((entry) => {
            const colors = seatColor(entry.seat);
            return (
              <motion.div
                key={entry.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={motionTransition(reduce, springs.snappy)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs',
                  entry.correct ? 'bg-moss-100 text-moss-700' : 'bg-transparent text-ink-700',
                )}
              >
                <span className={cn('font-medium', colors.text)}>{seatName(entry.seat)}</span>
                {entry.correct ? (
                  <span className="flex items-center gap-1 font-medium">
                    <Check size={12} /> guessed the word!
                  </span>
                ) : (
                  <span className="truncate text-ink-600">{entry.text}</span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {!isArtist && (
        <div className="border-t border-ink-200 p-3">
          <motion.div
            animate={lastWasWrong ? { x: [0, -6, 6, -6, 6, 0] } : {}}
            transition={{ duration: 0.35 }}
            className="flex gap-2"
          >
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder={alreadyCorrect ? 'You got it!' : 'Type your guess…'}
              disabled={alreadyCorrect}
              autoComplete="off"
            />
            <Button variant="primary" onClick={submit} disabled={alreadyCorrect || !value.trim()}>
              <Send size={16} />
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
