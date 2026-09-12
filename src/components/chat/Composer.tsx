import { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { MentionTextarea } from '@/components/mentions/MentionTextarea';
import { useChatUploads } from '@/hooks/useChatUploads';
import { formatBytes } from '@/components/media/useAttachmentUrl';
import type { PresenceEntry, PresencePeek } from '@/lib/types';
import {
  Send, Paperclip, X, AlertCircle, Loader2, Bold, Italic, Code, Strikethrough, List, Moon,
} from 'lucide-react';
import { format } from 'date-fns';

interface ComposerProps {
  apiBase: string;
  channelId: string;
  placeholder: string;
  mentionsEnabled: boolean;
  disabled?: boolean;
  /** Set when this composer is posting into a thread rather than the channel. */
  parentMessageId?: string;
  /** The DM counterpart's presence, so focus can be surfaced before the message is sent. */
  counterpartPresence?: PresenceEntry | PresencePeek | null;
  counterpartName?: string;
  onSend: (payload: { body: string; attachmentIds: string[]; notifyAnyway: boolean }) => void;
  onTyping: () => void;
}

/** Wraps the selection in a markdown delimiter, or inserts the pair ready to type between. */
function wrapSelection(
  textarea: HTMLTextAreaElement | null,
  value: string,
  before: string,
  after: string,
  onChange: (next: string) => void,
) {
  if (!textarea) {
    onChange(`${value}${before}${after}`);
    return;
  }
  const start = textarea.selectionStart ?? value.length;
  const end = textarea.selectionEnd ?? value.length;
  const selected = value.slice(start, end);
  const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
  onChange(next);
  requestAnimationFrame(() => {
    textarea.focus();
    const caret = start + before.length + selected.length;
    textarea.setSelectionRange(caret, caret);
  });
}

export function Composer({
  apiBase,
  channelId,
  placeholder,
  mentionsEnabled,
  disabled,
  parentMessageId,
  counterpartPresence,
  counterpartName,
  onSend,
  onTyping,
}: ComposerProps) {
  const [draft, setDraft] = useState('');
  const [notifyAnyway, setNotifyAnyway] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragDepth = useRef(0);

  const { uploads, addFiles, remove, clear, readyIds, isUploading } = useChatUploads(apiBase, channelId);

  const inFocusMode = !!counterpartPresence?.focusMode;
  const focusUntil = (counterpartPresence as PresenceEntry | undefined)?.focusUntil;
  const focusMessage = (counterpartPresence as PresenceEntry | undefined)?.focusMessage;

  const canSend = (draft.trim().length > 0 || readyIds.length > 0) && !isUploading && !disabled;

  const submit = () => {
    if (!canSend) return;
    onSend({ body: draft.trim(), attachmentIds: readyIds, notifyAnyway });
    setDraft('');
    setNotifyAnyway(false);
    clear();
  };

  const textareaOf = () => wrapperRef.current?.querySelector('textarea') ?? null;

  /** Images pasted from the clipboard upload exactly like dropped files. */
  const onPaste = useCallback(
    (event: React.ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length) {
        event.preventDefault();
        addFiles(files);
      }
    },
    [addFiles],
  );

  // Depth counting, because dragenter/dragleave fire for every child element the pointer
  // crosses — a naive boolean flickers the overlay constantly.
  const onDragEnter = (event: React.DragEvent) => {
    if (!event.dataTransfer?.types?.includes('Files')) return;
    dragDepth.current += 1;
    setDragging(true);
  };
  const onDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };
  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) addFiles(files);
  };

  return (
    <div
      ref={wrapperRef}
      className="relative border-t border-ink-200 px-5 py-3"
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-2 z-20 flex items-center justify-center rounded-md border-2 border-dashed border-brass-500 bg-brass-50/90">
          <p className="text-sm font-medium text-brass-800">Drop files to attach</p>
        </div>
      )}

      {inFocusMode && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md border border-brass-200 bg-brass-50 px-3 py-2">
          <Moon size={14} className="flex-shrink-0 text-brass-600" />
          <p className="min-w-0 flex-1 text-xs text-brass-800">
            <span className="font-medium">{counterpartName ?? 'They'}</span>{' '}
            {counterpartName ? 'is' : 'are'} in focus mode
            {focusUntil && ` until ${format(new Date(focusUntil), 'h:mm a')}`} — your message will be delivered
            quietly.
            {focusMessage && <span className="ml-1 italic">“{focusMessage}”</span>}
          </p>
          <label className="flex flex-shrink-0 cursor-pointer select-none items-center gap-1.5 text-xs text-brass-800">
            <input
              type="checkbox"
              checked={notifyAnyway}
              onChange={(e) => setNotifyAnyway(e.target.checked)}
              className="h-3.5 w-3.5 rounded-sm border-brass-300 accent-brass-600"
            />
            Notify anyway
          </label>
        </div>
      )}

      {uploads.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {uploads.map((upload) => (
            <div
              key={upload.localId}
              className={cn(
                'relative flex items-center gap-2 rounded-md border bg-surface px-2.5 py-2',
                upload.error ? 'border-terracotta-300' : 'border-ink-200',
              )}
            >
              {upload.previewUrl ? (
                <img src={upload.previewUrl} alt="" className="h-9 w-9 rounded-sm object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-ink-100 text-ink-500">
                  <Paperclip size={15} />
                </span>
              )}
              <div className="min-w-0 max-w-[180px]">
                <p className="truncate text-xs font-medium text-ink-800">{upload.filename}</p>
                {upload.error ? (
                  <p className="flex items-center gap-1 text-[11px] text-terracotta-600">
                    <AlertCircle size={10} />
                    {upload.error}
                  </p>
                ) : upload.done ? (
                  <p className="text-[11px] text-ink-400">{formatBytes(upload.sizeBytes)}</p>
                ) : (
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-ink-200">
                    <div
                      className="h-full rounded-full bg-pine-700 transition-all"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => void remove(upload.localId)}
                aria-label={`Remove ${upload.filename}`}
                className="rounded-sm p-1 text-ink-400 transition-colors duration-hover ease-brand hover:bg-ink-100 hover:text-ink-700"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-md border border-ink-300 bg-surface transition-colors duration-hover ease-brand focus-within:border-brass-500 focus-within:ring-2 focus-within:ring-brass-200">
        <div className="flex items-center gap-0.5 border-b border-ink-200 px-2 py-1">
          {[
            { icon: Bold, label: 'Bold', before: '**', after: '**' },
            { icon: Italic, label: 'Italic', before: '*', after: '*' },
            { icon: Strikethrough, label: 'Strikethrough', before: '~~', after: '~~' },
            { icon: Code, label: 'Code', before: '`', after: '`' },
            { icon: List, label: 'Bulleted list', before: '\n- ', after: '' },
          ].map(({ icon: Icon, label, before, after }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={() => wrapSelection(textareaOf(), draft, before, after, setDraft)}
              className="rounded-sm p-1.5 text-ink-400 transition-colors duration-hover ease-brand hover:bg-ink-100 hover:text-ink-700"
            >
              <Icon size={14} />
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-ink-200" />
          <button
            type="button"
            aria-label="Attach a file"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-sm p-1.5 text-ink-400 transition-colors duration-hover ease-brand hover:bg-ink-100 hover:text-ink-700"
          >
            <Paperclip size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />
        </div>

        <div className="flex items-end gap-2 p-2" onPaste={onPaste}>
          <MentionTextarea
            className="min-h-[40px] max-h-40 border-0 bg-transparent focus:border-0 focus:ring-0"
            placeholder={placeholder}
            value={draft}
            onChange={(value) => {
              setDraft(value);
              onTyping();
            }}
            onSubmit={submit}
            mentionsEnabled={mentionsEnabled}
          />
          <Button
            variant="primary"
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            onClick={submit}
            disabled={!canSend}
            aria-label={parentMessageId ? 'Send reply' : 'Send message'}
          >
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
