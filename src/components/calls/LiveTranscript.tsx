import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, Check, X } from 'lucide-react';
import { useLiveTranscriptStore, type Utterance } from '@/store/liveTranscript';
import { seatColor } from '@/lib/arcade/playerColors';
import { cn } from '@/lib/utils';

/** How far off the bottom the user can be before autoscroll releases. */
const PIN_TOLERANCE_PX = 24;

function formatStamp(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function LiveTranscript({ className }: { className?: string }) {
  const utterances = useLiveTranscriptStore((s) => s.utterances);
  const speakers = useLiveTranscriptStore((s) => s.speakers);
  const interim = useLiveTranscriptStore((s) => s.interim);
  const streamState = useLiveTranscriptStore((s) => s.streamState);
  const renameSpeaker = useLiveTranscriptStore((s) => s.renameSpeaker);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);
  const [missed, setMissed] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const pendingInterim = [interim.mic, interim.system].filter(Boolean).join(' ');

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= PIN_TOLERANCE_PX;
    setPinned(atBottom);
    if (atBottom) setMissed(0);
  }, []);

  // useLayoutEffect so the scroll lands in the same frame the line paints —
  // with useEffect the panel visibly jumps on every new utterance.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (pinned) el.scrollTop = el.scrollHeight;
    else setMissed((n) => n + 1);
    // `pinned` is deliberately not a dependency: re-running on unpin would
    // immediately count a missed line the user is actually looking at.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utterances.length, pendingInterim]);

  const jumpToLive = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setPinned(true);
    setMissed(0);
  }, []);

  // A line only carries a speaker heading when the speaker actually changes —
  // repeating the same name down a 320px column is noise, not information.
  const rows = useMemo(() => {
    let previousKey: string | null = null;
    return utterances.map((u) => {
      const showSpeaker = u.speakerKey !== previousKey;
      previousKey = u.speakerKey;
      return { utterance: u, showSpeaker };
    });
  }, [utterances]);

  const connecting = streamState.mic === 'connecting' || streamState.system === 'connecting';
  const reconnecting = streamState.mic === 'reconnecting' || streamState.system === 'reconnecting';

  return (
    <div className={cn('relative flex h-full flex-col', className)}>
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 space-y-2.5 overflow-y-auto pr-0.5">
        {rows.length === 0 && !pendingInterim && (
          <p className="pt-8 text-center text-xs text-ink-400">
            {connecting ? 'Connecting to transcription…' : 'Listening — the transcript appears as people speak.'}
          </p>
        )}

        {rows.map(({ utterance, showSpeaker }) => (
          <TranscriptRow
            key={utterance.id}
            utterance={utterance}
            showSpeaker={showSpeaker}
            speaker={speakers[utterance.speakerKey]}
            reduceMotion={!!reduceMotion}
            isEditing={editing === utterance.speakerKey}
            onStartEdit={() => setEditing(utterance.speakerKey)}
            onCancelEdit={() => setEditing(null)}
            onRename={(name) => {
              renameSpeaker(utterance.speakerKey, name);
              setEditing(null);
            }}
          />
        ))}

        {pendingInterim && (
          <p className="pl-2 text-xs leading-relaxed text-ink-400">
            {pendingInterim}
            {/* The caret pulses, never the text — a pulsing paragraph in an
                always-on-top panel is genuinely unpleasant to sit next to. */}
            <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-ink-300 align-text-bottom" />
          </p>
        )}
      </div>

      {!pinned && (
        <button
          type="button"
          onClick={jumpToLive}
          className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-md bg-ink-800 px-2.5 py-1.5 text-[11px] font-medium text-bone-100 shadow-md transition-colors hover:bg-ink-900"
        >
          <ArrowDown size={12} />
          {missed > 0 ? `${missed} new` : 'Jump to live'}
        </button>
      )}

      {reconnecting && (
        <p className="flex-shrink-0 pt-2 text-center text-[11px] text-ochre-600">
          Reconnecting to transcription — the recording is still running.
        </p>
      )}
    </div>
  );
}

interface RowProps {
  utterance: Utterance;
  showSpeaker: boolean;
  speaker?: { displayName: string; colorIndex: number };
  reduceMotion: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onRename: (name: string) => void;
}

function TranscriptRow({ utterance, showSpeaker, speaker, reduceMotion, isEditing, onStartEdit, onCancelEdit, onRename }: RowProps) {
  const color = seatColor(speaker?.colorIndex ?? 0);
  const name = speaker?.displayName ?? 'Speaker';

  return (
    <motion.div
      layout={!reduceMotion}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className={cn('border-l-[3px] pl-2', color.border)}
    >
      {showSpeaker && (
        <div className="mb-0.5 flex items-baseline gap-1.5">
          {isEditing ? (
            <SpeakerRename initial={name} onSubmit={onRename} onCancel={onCancelEdit} />
          ) : (
            <button
              type="button"
              onClick={onStartEdit}
              title="Rename this speaker — applies to every line of the call"
              className={cn(
                'cursor-pointer text-[11px] font-semibold uppercase tracking-[0.08em] hover:underline',
                color.text,
              )}
            >
              {name}
            </button>
          )}
          <span className="font-mono text-[10px] tabular-nums text-ink-300">{formatStamp(utterance.startMs)}</span>
        </div>
      )}
      <p className="text-xs leading-relaxed text-ink-700">{utterance.text}</p>
    </motion.div>
  );
}

function SpeakerRename({ initial, onSubmit, onCancel }: { initial: string; onSubmit: (name: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
    else onCancel();
  };

  return (
    <span className="flex items-center gap-1">
      <input
        ref={inputRef}
        value={value}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') onCancel();
        }}
        className="w-28 rounded-sm border border-ink-300 bg-bone-50 px-1 py-0.5 text-[11px] text-ink-900 outline-none focus:border-brass-500 focus:ring-2 focus:ring-brass-500/30"
      />
      <button type="button" onClick={commit} className="cursor-pointer text-pine-600 hover:text-pine-700" title="Save">
        <Check size={12} />
      </button>
      <button type="button" onClick={onCancel} className="cursor-pointer text-ink-400 hover:text-ink-600" title="Cancel">
        <X size={12} />
      </button>
    </span>
  );
}
