import { cn } from '@/lib/utils';
import { CountdownRing } from '../../components/CountdownRing';

interface WordChoiceOption {
  text: string;
  parts: string[];
}

interface WordChoiceModalProps {
  options: WordChoiceOption[];
  /** The end of the artist's pick window — the server auto-picks when this passes. */
  deadlineAt: number;
  /** Total choice-window length, so the countdown ring can deplete over it. */
  choiceTimeoutMs: number;
  onChoose: (index: number) => void;
}

/** The 1-of-3 prompt picker shown to the artist at the start of every Doodle Relay round,
 *  before drawing tools unlock — skribble.io-style. Sits over the canvas; the artist can't
 *  draw until one of the words is locked in (the server also auto-picks on timeout). Built on
 *  the same overlay chrome as ChessPromotionModal (backdrop + centered card). */
export function WordChoiceModal({ options, deadlineAt, choiceTimeoutMs, onChoose }: WordChoiceModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4" role="presentation">
      <div className="w-full max-w-md rounded-lg border border-ink-200 bg-bone-50 p-6 shadow-lg">
        <div className="mb-1 flex items-center justify-center gap-3">
          <CountdownRing deadlineAt={deadlineAt} durationMs={choiceTimeoutMs} size={44} />
        </div>
        <p className="mb-4 text-center text-sm font-medium text-ink-700">Pick a word to draw</p>
        <div className="grid grid-cols-1 gap-2">
          {options.map((option, index) => (
            <button
              key={`${option.text}-${index}`}
              type="button"
              onClick={() => onChoose(index)}
              className={cn(
                'rounded-md border border-ink-200 bg-bone-100 px-4 py-3 text-center transition-colors duration-hover ease-brand',
                'hover:border-brass-400 hover:bg-brass-50',
              )}
            >
              <span className="font-display text-lg text-ink-900">{option.text}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-ink-400">If you don't pick in time, one will be chosen for you.</p>
      </div>
    </div>
  );
}