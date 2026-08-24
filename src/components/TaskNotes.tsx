import { useState } from 'react';
import type { TaskNote } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MentionTextarea } from '@/components/mentions/MentionTextarea';
import { Send, StickyNote } from 'lucide-react';
import { format } from 'date-fns';

interface TaskNotesProps {
  notes?: TaskNote[];
  canAdd?: boolean;
  onAddNote: (body: string) => void;
  /** False for the client portal — GET /team-chat/members is studio-only. */
  enableMentions?: boolean;
}

export function TaskNotes({ notes = [], canAdd = true, onAddNote, enableMentions = true }: TaskNotesProps) {
  const [draft, setDraft] = useState('');
  const sorted = [...notes].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    onAddNote(body);
    setDraft('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <StickyNote size={16} className="text-ink-400" />
        <h4 className="text-sm font-semibold text-ink-900">Notes</h4>
        <Badge variant="neutral" className="h-5 px-2">
          {sorted.length}
        </Badge>
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-ink-400">No notes yet on this task.</p>
      ) : (
        <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
          {sorted.map((note) => {
            const fromClient = note.authorType === 'client';
            return (
              <div
                key={note.id}
                className="flex items-start gap-3 rounded-sm border border-ink-200 bg-bone-50 p-3"
              >
                <Avatar name={note.authorName || (fromClient ? 'Client' : 'Team')} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink-900">
                        {note.authorName || (fromClient ? 'Client' : 'Team')}
                      </span>
                      <Badge variant={fromClient ? 'brass' : 'pine'} className="h-4 px-1.5 text-[10px]">
                        {fromClient ? 'Client' : 'Team'}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-ink-400">
                      {format(new Date(note.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-700 whitespace-pre-wrap">{note.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canAdd && (
        <div className="flex items-end gap-3">
          <MentionTextarea
            className="min-h-[44px] max-h-32"
            placeholder={enableMentions ? 'Add a note... (@ to mention a teammate)' : 'Add a note...'}
            value={draft}
            onChange={setDraft}
            onSubmit={submit}
            mentionsEnabled={enableMentions}
          />
          <Button
            variant="primary"
            size="icon"
            className="h-[44px] w-[44px] flex-shrink-0"
            onClick={submit}
            disabled={!draft.trim()}
          >
            <Send size={18} />
          </Button>
        </div>
      )}
    </div>
  );
}
