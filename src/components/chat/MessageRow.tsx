import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { PresenceBadge } from '@/components/ui/PresenceDot';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { AttachmentGrid } from '@/components/media/AttachmentGrid';
import { ReactionBar, EmojiPicker } from './ReactionBar';
import { renderMarkdownLite } from '@/lib/chatMarkdown';
import { usePresenceStore, presenceStateOf } from '@/store/presence';
import type { ChatAttachment, TeamChannelMessage, TeamMemberType } from '@/lib/types';
import { format } from 'date-fns';
import { MessageSquare, Pencil, Trash2, Pin, PinOff, Link2, SmilePlus, Check, X } from 'lucide-react';

export interface MessageRowActions {
  onReact: (messageId: string, emoji: string, mine: boolean) => void;
  onEdit: (messageId: string, body: string) => void;
  onDelete: (messageId: string) => void;
  onTogglePin: (messageId: string, pinned: boolean) => void;
  onOpenThread?: (messageId: string) => void;
  onCopyLink: (messageId: string) => void;
}

function HoverToolbar({
  message,
  isMine,
  canPin,
  canModerate,
  showThread,
  actions,
  onStartEdit,
}: {
  message: TeamChannelMessage;
  isMine: boolean;
  canPin: boolean;
  canModerate: boolean;
  showThread: boolean;
  actions: MessageRowActions;
  onStartEdit: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div
      className={cn(
        'absolute -top-3 right-2 z-20 flex items-center rounded-md border border-ink-200 bg-surface shadow-sm',
        'opacity-0 transition-opacity duration-hover ease-brand',
        'group-hover:opacity-100 focus-within:opacity-100',
      )}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          aria-label="Add a reaction"
          className="rounded-sm p-1.5 text-ink-400 transition-colors duration-hover ease-brand hover:bg-ink-100 hover:text-ink-700"
        >
          <SmilePlus size={15} />
        </button>
        {pickerOpen && (
          <EmojiPicker
            onPick={(emoji) => actions.onReact(message.id, emoji, false)}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>

      {showThread && (
        <button
          type="button"
          onClick={() => actions.onOpenThread?.(message.id)}
          aria-label="Reply in thread"
          className="rounded-sm p-1.5 text-ink-400 transition-colors duration-hover ease-brand hover:bg-ink-100 hover:text-ink-700"
        >
          <MessageSquare size={15} />
        </button>
      )}

      {canPin && (
        <button
          type="button"
          onClick={() => actions.onTogglePin(message.id, !message.isPinned)}
          aria-label={message.isPinned ? 'Unpin message' : 'Pin message'}
          className={cn(
            'rounded-sm p-1.5 transition-colors duration-hover ease-brand hover:bg-ink-100',
            message.isPinned ? 'text-brass-600' : 'text-ink-400 hover:text-ink-700',
          )}
        >
          {message.isPinned ? <PinOff size={15} /> : <Pin size={15} />}
        </button>
      )}

      <button
        type="button"
        onClick={() => actions.onCopyLink(message.id)}
        aria-label="Copy link to message"
        className="rounded-sm p-1.5 text-ink-400 transition-colors duration-hover ease-brand hover:bg-ink-100 hover:text-ink-700"
      >
        <Link2 size={15} />
      </button>

      {isMine && (
        <button
          type="button"
          onClick={onStartEdit}
          aria-label="Edit message"
          className="rounded-sm p-1.5 text-ink-400 transition-colors duration-hover ease-brand hover:bg-ink-100 hover:text-ink-700"
        >
          <Pencil size={15} />
        </button>
      )}

      {(isMine || canModerate) && (
        <button
          type="button"
          onClick={() => actions.onDelete(message.id)}
          aria-label="Delete message"
          className="rounded-sm p-1.5 text-ink-400 transition-colors duration-hover ease-brand hover:bg-terracotta-50 hover:text-terracotta-600"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}

/**
 * One message.
 *
 * Left-aligned rows rather than opposing bubbles: in a channel with several people, scanning
 * a single left edge beats a zig-zag, and it is what makes consecutive-message grouping
 * possible at all. Consecutive messages from the same sender collapse into a continuation
 * row whose timestamp only appears on hover.
 */
export function MessageRow({
  message,
  grouped,
  isMine,
  myType,
  myId,
  canModerate,
  apiBase,
  mentionNames,
  selfName,
  galleryImages,
  actions,
  showThreadAffordance = true,
  isUnreadAnchor = false,
  highlighted = false,
}: {
  message: TeamChannelMessage;
  grouped: boolean;
  isMine: boolean;
  myType: TeamMemberType;
  myId: string;
  canModerate: boolean;
  apiBase: string;
  mentionNames: string[];
  selfName?: string;
  galleryImages?: ChatAttachment[];
  actions: MessageRowActions;
  showThreadAffordance?: boolean;
  isUnreadAnchor?: boolean;
  highlighted?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body);

  const senderPresence = usePresenceStore((s) => s.entries[`${message.senderType}:${message.senderId}`]);
  const replyCount = message.replyCount ?? 0;

  if (message.isDeleted) {
    return (
      <div className="group relative px-5 py-1">
        <div className="flex gap-3">
          <div className="w-9 flex-shrink-0" />
          <p className="text-sm italic text-ink-400">This message was deleted</p>
        </div>
      </div>
    );
  }

  const commitEdit = () => {
    const next = draft.trim();
    if (next && next !== message.body) actions.onEdit(message.id, next);
    setEditing(false);
  };

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        'group relative px-5 transition-colors duration-hover ease-brand',
        grouped ? 'py-0.5' : 'pb-1 pt-2',
        'hover:bg-ink-50/60',
        highlighted && 'bg-brass-50/60',
        isUnreadAnchor && 'scroll-mt-16',
      )}
    >
      {!editing && (
        <HoverToolbar
          message={message}
          isMine={isMine}
          canPin={showThreadAffordance}
          canModerate={canModerate}
          showThread={showThreadAffordance}
          actions={actions}
          onStartEdit={() => {
            setDraft(message.body);
            setEditing(true);
          }}
        />
      )}

      <div className="flex gap-3">
        <div className="w-9 flex-shrink-0">
          {grouped ? (
            // The timestamp lives in the avatar gutter on continuation rows, revealed on
            // hover, so a run of messages reads as one block without losing the detail.
            <span className="mt-1 hidden text-right text-[10px] leading-5 text-ink-400 tabular-nums group-hover:block">
              {format(new Date(message.createdAt), 'h:mm')}
            </span>
          ) : (
            <PresenceBadge state={presenceStateOf(senderPresence)} size="sm">
              <Avatar
                name={message.senderName}
                src={message.senderAvatarUrl ?? undefined}
                className="h-9 w-9"
              />
            </PresenceBadge>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {!grouped && (
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-ink-900">{message.senderName}</span>
              <span className="text-[11px] text-ink-400 tabular-nums">
                {format(new Date(message.createdAt), 'h:mm a')}
              </span>
              {message.isPinned && (
                <span className="flex items-center gap-0.5 text-[10px] font-medium uppercase tracking-wide text-brass-600">
                  <Pin size={10} />
                  Pinned
                </span>
              )}
            </div>
          )}

          {editing ? (
            <div className="mt-1 space-y-2">
              <Textarea
                value={draft}
                autoFocus
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    commitEdit();
                  } else if (e.key === 'Escape') {
                    setEditing(false);
                  }
                }}
                className="min-h-[60px]"
              />
              <div className="flex items-center gap-2">
                <Button size="sm" variant="primary" onClick={commitEdit}>
                  <Check size={14} />
                  Save
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
                  <X size={14} />
                  Cancel
                </Button>
                <span className="text-[11px] text-ink-400">Enter to save, Escape to cancel</span>
              </div>
            </div>
          ) : (
            <>
              {message.body && (
                <div className="text-[15px] leading-relaxed text-ink-800">
                  {renderMarkdownLite(message.body, { names: mentionNames, selfName })}
                  {message.editedAt && <span className="ml-1 text-[11px] text-ink-400">(edited)</span>}
                </div>
              )}

              {!!message.attachments?.length && (
                <AttachmentGrid
                  apiBase={apiBase}
                  attachments={message.attachments}
                  galleryImages={galleryImages}
                />
              )}

              <ReactionBar
                reactions={message.reactions ?? []}
                myType={myType}
                myId={myId}
                onToggle={(emoji, mine) => actions.onReact(message.id, emoji, mine)}
              />

              {showThreadAffordance && replyCount > 0 && (
                <button
                  type="button"
                  onClick={() => actions.onOpenThread?.(message.id)}
                  className="mt-1 flex items-center gap-2 rounded-sm px-1 py-0.5 text-xs text-pine-700 transition-colors duration-hover ease-brand hover:bg-pine-50"
                >
                  <span className="flex -space-x-1.5">
                    {(message.threadParticipants ?? []).slice(0, 3).map((participant) => (
                      <Avatar
                        key={`${participant.type}:${participant.id}`}
                        name={participant.name}
                        className="h-4 w-4 ring-1 ring-bone-50"
                      />
                    ))}
                  </span>
                  <span className="font-medium">
                    {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                  </span>
                  {message.lastReplyAt && (
                    <span className="text-ink-400">
                      Last reply {format(new Date(message.lastReplyAt), 'MMM d, h:mm a')}
                    </span>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
