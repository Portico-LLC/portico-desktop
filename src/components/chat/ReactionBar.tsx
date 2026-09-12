import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ChatReaction, TeamMemberType } from '@/lib/types';
import { SmilePlus } from 'lucide-react';

/** A small curated set beats a 1,800-emoji picker for a work tool, and needs no dependency
 *  and no sprite sheet. The first row is what people actually reach for. */
const EMOJI_GROUPS: { label: string; emoji: string[] }[] = [
  { label: 'Reactions', emoji: ['👍', '🎉', '✅', '👀', '🙌', '🔥', '💯', '🙏'] },
  { label: 'Faces', emoji: ['😄', '😅', '😂', '🙂', '😍', '🤔', '😬', '😴'] },
  { label: 'Work', emoji: ['🚀', '🐛', '📌', '⚠️', '⏳', '📝', '☕', '🧠'] },
  { label: 'Hearts', emoji: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍'] },
];

const RECENTS_KEY = 'portico.chat.recentEmoji';
const MAX_RECENTS = 8;

function readRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, MAX_RECENTS) : [];
  } catch {
    // Private windows and blocked site data both throw here; recents are a convenience.
    return [];
  }
}

function pushRecent(emoji: string): void {
  try {
    const next = [emoji, ...readRecents().filter((e) => e !== emoji)].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    // Non-critical.
  }
}

export function EmojiPicker({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [recents] = useState(readRecents);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const pick = (emoji: string) => {
    pushRecent(emoji);
    onPick(emoji);
    onClose();
  };

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-30 mt-1 w-64 rounded-md border border-ink-200 bg-surface p-2 shadow-md"
      role="dialog"
      aria-label="Pick a reaction"
    >
      {recents.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-ink-400">Recent</p>
          <div className="grid grid-cols-8 gap-0.5">
            {recents.map((emoji) => (
              <button
                key={`recent-${emoji}`}
                type="button"
                onClick={() => pick(emoji)}
                className="rounded-sm p-1 text-lg leading-none transition-colors duration-hover ease-brand hover:bg-ink-100"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="max-h-56 space-y-2 overflow-y-auto">
        {EMOJI_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-ink-400">{group.label}</p>
            <div className="grid grid-cols-8 gap-0.5">
              {group.emoji.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => pick(emoji)}
                  className="rounded-sm p-1 text-lg leading-none transition-colors duration-hover ease-brand hover:bg-ink-100"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Reaction chips. Radius-full is deliberate — chips are the one pill shape the design
 *  system allows. */
export function ReactionBar({
  reactions,
  myType,
  myId,
  onToggle,
}: {
  reactions: ChatReaction[];
  myType: TeamMemberType;
  myId: string;
  onToggle: (emoji: string, mine: boolean) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  if (!reactions.length && !pickerOpen) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {reactions.map((reaction) => {
        const mine = reaction.actors.some((a) => a.type === myType && a.id === myId);
        const names = reaction.actors.map((a) => a.name);
        return (
          <button
            key={reaction.emoji}
            type="button"
            onClick={() => onToggle(reaction.emoji, mine)}
            title={`${names.slice(0, 12).join(', ')}${names.length > 12 ? '…' : ''} reacted with ${reaction.emoji}`}
            className={cn(
              'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors duration-hover ease-brand',
              mine
                ? 'border-brass-400 bg-brass-50 text-brass-800'
                : 'border-ink-200 bg-ink-50 text-ink-600 hover:border-ink-300 hover:bg-ink-100',
            )}
          >
            <span className="text-sm leading-none">{reaction.emoji}</span>
            <span className="tabular-nums">{reaction.count}</span>
          </button>
        );
      })}
      <div className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          aria-label="Add a reaction"
          className="flex items-center rounded-full border border-dashed border-ink-300 px-2 py-1 text-ink-400 transition-colors duration-hover ease-brand hover:border-ink-400 hover:text-ink-600"
        >
          <SmilePlus size={13} />
        </button>
        {pickerOpen && <EmojiPicker onPick={(emoji) => onToggle(emoji, false)} onClose={() => setPickerOpen(false)} />}
      </div>
    </div>
  );
}
