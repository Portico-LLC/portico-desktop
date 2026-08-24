import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TeamMemberOption } from '@/lib/types';
import { cn } from '@/lib/utils';

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
  /** Set false for callers who can't resolve GET /team-chat/members (e.g. a client-portal
   *  caller — that route is studio-only, and a 401 there triggers a global logout via the
   *  api client's response interceptor). Renders a plain textarea with no "@" autocomplete. */
  mentionsEnabled?: boolean;
}

const MAX_SUGGESTIONS = 6;

/**
 * Drop-in replacement for a plain <textarea> that adds "@Name" autocomplete, sourced from
 * the same roster the backend resolves mentions against (GET /team-chat/members — owner +
 * active employees). Enter/Tab/click inserts "@Full Name ", matching exactly what
 * parse-mentions.ts on the backend looks for.
 */
export function MentionTextarea({
  value,
  onChange,
  onSubmit,
  placeholder,
  className,
  mentionsEnabled = true,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [queryStart, setQueryStart] = useState(0);
  const [highlighted, setHighlighted] = useState(0);

  const { data: members = [] } = useQuery({
    queryKey: ['team-chat', 'members'],
    queryFn: () => api.get<TeamMemberOption[]>('/team-chat/members').then((res) => res.data),
    enabled: mentionsEnabled && query !== null,
    staleTime: 60_000,
  });

  const candidates =
    query === null ? [] : members.filter((m) => m.name.toLowerCase().includes(query.toLowerCase())).slice(0, MAX_SUGGESTIONS);

  const updateMentionState = (text: string, cursor: number) => {
    if (!mentionsEnabled) return;
    const match = text.slice(0, cursor).match(/@([^\s@]*)$/);
    if (match) {
      setQuery(match[1]);
      setQueryStart(cursor - match[1].length - 1);
      setHighlighted(0);
    } else {
      setQuery(null);
    }
  };

  const insertMention = (member: TeamMemberOption) => {
    if (query === null) return;
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const next = `${value.slice(0, queryStart)}@${member.name} ${value.slice(cursor)}`;
    onChange(next);
    setQuery(null);
    const pos = queryStart + member.name.length + 2;
    requestAnimationFrame(() => {
      textareaRef.current?.setSelectionRange(pos, pos);
      textareaRef.current?.focus();
    });
  };

  return (
    <div className="relative flex-1">
      <textarea
        ref={textareaRef}
        className={cn(
          'w-full resize-y rounded-sm border border-ink-300 bg-bone-50 px-3 py-2.5 text-sm placeholder:text-ink-400 focus:border-brass-500 focus:outline-none focus:ring-2 focus:ring-brass-200',
          className
        )}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          updateMentionState(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={(e) => {
          if (query !== null && candidates.length) {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlighted((h) => (h + 1) % candidates.length);
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlighted((h) => (h - 1 + candidates.length) % candidates.length);
              return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault();
              insertMention(candidates[highlighted]);
              return;
            }
            if (e.key === 'Escape') {
              setQuery(null);
              return;
            }
          }
          if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
            e.preventDefault();
            onSubmit();
          }
        }}
        onBlur={() => {
          // Let a candidate's onMouseDown (which preventDefault()s) fire before we close the list.
          setTimeout(() => setQuery(null), 150);
        }}
      />
      {query !== null && candidates.length > 0 && (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-56 animate-fade-up rounded-md border border-ink-200 bg-bone-50 py-1 shadow-lg">
          {candidates.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertMention(m)}
              className={cn(
                'flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors',
                i === highlighted ? 'bg-brass-50 text-ink-900' : 'text-ink-700 hover:bg-ink-50'
              )}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
