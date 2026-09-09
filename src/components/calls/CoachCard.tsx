import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Lightbulb, X, AlertTriangle } from 'lucide-react';
import { useLiveTranscriptStore } from '@/store/liveTranscript';

/** Long enough to read and act on, short enough that it never lingers into a
 *  different part of the conversation. */
const AUTO_DISMISS_MS = 45_000;

/**
 * A suggested reply to what the client just asked.
 *
 * Two things about this component are deliberate rather than stylistic. It renders
 * ABOVE the transcript's scroll container, never inside it, and it is the only place
 * in the call UI that uses brass — the transcript's speaker colours come from the
 * seat palette, which starts at pine. Between the placement, the colour, and the
 * explicit "not said" label, it should be impossible to mistake for something a
 * person on the call actually said.
 *
 * There is no send button, and no code path exists that would deliver this to
 * anyone. It is something to read and say in your own words.
 */
export function CoachCard() {
  const suggestion = useLiveTranscriptStore((s) => s.suggestion);
  const dismiss = useLiveTranscriptStore((s) => s.dismissSuggestion);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!suggestion) return;
    const timer = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [suggestion, dismiss]);

  if (!suggestion) return null;

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
      // Capped as a share of the column so the live transcript always keeps the
      // majority of a 520px-tall panel.
      className="mb-2 max-h-[32%] flex-shrink-0 overflow-y-auto rounded-lg border border-brass-500/30 border-l-[3px] border-l-brass-600 bg-bone-50 px-2.5 py-2"
    >
      <div className="mb-1 flex items-center gap-1.5">
        <Lightbulb size={12} className="flex-shrink-0 text-brass-600" />
        <span className="flex-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-brass-600">
          Suggested — not said
        </span>
        <button
          type="button"
          onClick={dismiss}
          className="flex-shrink-0 cursor-pointer text-ink-400 hover:text-ink-600"
          title="Dismiss"
        >
          <X size={12} />
        </button>
      </div>

      <p className="text-xs font-medium text-ink-900">{suggestion.headline}</p>

      {suggestion.talkingPoints.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {suggestion.talkingPoints.map((point, i) => (
            <li key={i} className="text-[11px] leading-snug text-ink-600">
              • {point}
            </li>
          ))}
        </ul>
      )}

      {suggestion.cautions.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {suggestion.cautions.map((caution, i) => (
            <p key={i} className="flex items-start gap-1 text-[10px] leading-snug text-ochre-600">
              <AlertTriangle size={10} className="mt-0.5 flex-shrink-0" />
              {caution}
            </p>
          ))}
        </div>
      )}
    </motion.div>
  );
}
