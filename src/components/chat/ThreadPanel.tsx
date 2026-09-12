import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { MessageRow, type MessageRowActions } from './MessageRow';
import { Composer } from './Composer';
import type { ChatAttachment, TeamChannelMessage, TeamMemberType } from '@/lib/types';
import { X, Loader2 } from 'lucide-react';

/**
 * The thread side panel.
 *
 * A drawer rather than a modal: threads are read alongside the channel, not instead of it,
 * and a modal would black out the conversation the thread belongs to.
 */
export function ThreadPanel({
  apiBase,
  parentMessage,
  channelId,
  myType,
  myId,
  canModerate,
  mentionNames,
  selfName,
  mentionsEnabled,
  actions,
  onClose,
  onSendReply,
  onTyping,
}: {
  apiBase: string;
  parentMessage: TeamChannelMessage;
  channelId: string;
  myType: TeamMemberType;
  myId: string;
  canModerate: boolean;
  mentionNames: string[];
  selfName?: string;
  mentionsEnabled: boolean;
  actions: MessageRowActions;
  onClose: () => void;
  onSendReply: (payload: { body: string; attachmentIds: string[] }) => void;
  onTyping: () => void;
}) {
  const { data: replies = [], isLoading } = useQuery({
    queryKey: ['team-chat-thread', parentMessage.id],
    queryFn: () =>
      api.get<TeamChannelMessage[]>(`${apiBase}/messages/${parentMessage.id}/replies`).then((res) => res.data),
  });

  const galleryImages: ChatAttachment[] = [parentMessage, ...replies].flatMap(
    (m) => m.attachments?.filter((a) => a.fileType === 'image') ?? [],
  );

  // Replies can't themselves be replied to, so the thread affordance is suppressed inside
  // the panel — matching the one-level-deep model the server enforces.
  const threadActions: MessageRowActions = { ...actions, onOpenThread: undefined };

  return (
    <motion.aside
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 24, opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
      className="flex w-[380px] flex-shrink-0 flex-col border-l border-ink-200 bg-surface"
      aria-label="Thread"
    >
      <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">Thread</p>
          <p className="text-[11px] text-ink-400">
            {parentMessage.replyCount ?? 0} {(parentMessage.replyCount ?? 0) === 1 ? 'reply' : 'replies'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close thread"
          className="rounded-sm p-1.5 text-ink-400 transition-colors duration-hover ease-brand hover:bg-ink-100 hover:text-ink-700"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-bone-50 py-2">
        <MessageRow
          message={parentMessage}
          grouped={false}
          isMine={parentMessage.senderType === myType && parentMessage.senderId === myId}
          myType={myType}
          myId={myId}
          canModerate={canModerate}
          apiBase={apiBase}
          mentionNames={mentionNames}
          selfName={selfName}
          galleryImages={galleryImages}
          actions={threadActions}
          showThreadAffordance={false}
        />

        <div className="my-2 flex items-center px-5">
          <div className="h-px flex-1 bg-ink-200" />
          <span className="mx-3 text-[11px] text-ink-400">
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </span>
          <div className="h-px flex-1 bg-ink-200" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={16} className="animate-spin text-ink-300" />
          </div>
        ) : (
          replies.map((reply, index) => {
            const previous = replies[index - 1];
            const grouped =
              !!previous &&
              previous.senderType === reply.senderType &&
              previous.senderId === reply.senderId &&
              !previous.isDeleted &&
              new Date(reply.createdAt).getTime() - new Date(previous.createdAt).getTime() < 5 * 60 * 1000;
            return (
              <MessageRow
                key={reply.id}
                message={reply}
                grouped={grouped}
                isMine={reply.senderType === myType && reply.senderId === myId}
                myType={myType}
                myId={myId}
                canModerate={canModerate}
                apiBase={apiBase}
                mentionNames={mentionNames}
                selfName={selfName}
                galleryImages={galleryImages}
                actions={threadActions}
                showThreadAffordance={false}
              />
            );
          })
        )}
      </div>

      <Composer
        apiBase={apiBase}
        channelId={channelId}
        parentMessageId={parentMessage.id}
        placeholder="Reply in thread…"
        mentionsEnabled={mentionsEnabled}
        onSend={({ body, attachmentIds }) => onSendReply({ body, attachmentIds })}
        onTyping={onTyping}
      />
    </motion.aside>
  );
}
