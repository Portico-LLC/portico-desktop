import { useEffect, useRef, useState } from 'react';
import { Send, Plus, Trash2, Sparkles, Loader2, Check, AlertTriangle, MessageSquareText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBrainStore, type LiveToolEvent } from '@/store/brain';
import type { BrainMessage } from '@/lib/types';
import { format, isSameDay } from 'date-fns';

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    ),
  );
}

/** Minimal, dependency-free markdown for chat bubbles: **bold** and "- " bullet lists. */
function renderMarkdownLite(text: string): React.ReactNode {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    nodes.push(
      <ul key={key} className="my-1 list-disc space-y-0.5 pl-4">
        {listBuffer.map((item, i) => (
          <li key={i}>{renderInline(item, `${key}-li-${i}`)}</li>
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  lines.forEach((line, idx) => {
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (bulletMatch) {
      listBuffer.push(bulletMatch[1]);
      return;
    }
    flushList(`list-${idx}`);
    if (line.trim() === '') {
      nodes.push(<div key={`br-${idx}`} className="h-2" />);
    } else {
      nodes.push(<p key={`p-${idx}`}>{renderInline(line, `p-${idx}`)}</p>);
    }
  });
  flushList('list-end');

  return <>{nodes}</>;
}

const SUGGESTED_PROMPTS = [
  "What's overdue this week?",
  'Summarize my open tasks by priority',
  'Create a task called "Follow up with client" due tomorrow',
  'Which invoices are still unpaid?',
];

const CLIENT_SUGGESTED_PROMPTS = [
  'What tasks are still open for me?',
  'Show me my unpaid invoices',
  'Mark my "Review homepage copy" task as done',
];

function toolLabel(name: string): string {
  const map: Record<string, string> = {
    list_tasks: 'Looking up tasks',
    list_my_tasks: 'Looking up your tasks',
    get_task: 'Reading task details',
    create_task: 'Creating a task',
    update_task: 'Updating a task',
    update_task_status: 'Updating task status',
    delete_task: 'Deleting a task',
    list_projects: 'Looking up projects',
    list_my_projects: 'Looking up your projects',
    get_project: 'Reading project details',
    create_project: 'Creating a project',
    update_project: 'Updating a project',
    delete_project: 'Deleting a project',
    list_clients: 'Looking up clients',
    get_client: 'Reading client details',
    create_client: 'Creating a client',
    update_client: 'Updating a client',
    delete_client: 'Deleting a client',
    list_invoices: 'Looking up invoices',
    list_my_invoices: 'Looking up your invoices',
    get_invoice: 'Reading invoice details',
    create_invoice: 'Creating an invoice',
    update_invoice_status: 'Updating invoice status',
    delete_invoice: 'Deleting an invoice',
    list_conversations: 'Looking up conversations',
    send_message: 'Sending a message',
  };
  return map[name] ?? name.replace(/_/g, ' ');
}

export function BrainChat({ portal = false }: { portal?: boolean }) {
  const {
    threads,
    activeThreadId,
    messages,
    isLoadingThreads,
    isLoadingMessages,
    isStreaming,
    streamingText,
    liveToolEvents,
    pendingConfirmation,
    error,
    loadThreads,
    createThread,
    selectThread,
    deleteThread,
    sendMessage,
    confirmAction,
    clearError,
  } = useBrainStore();

  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeThreadId && !isLoadingThreads && threads.length > 0) {
      selectThread(threads[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads, isLoadingThreads]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, streamingText, liveToolEvents.length, pendingConfirmation]);

  const handleSend = (text?: string) => {
    const body = (text ?? draft).trim();
    if (!body || isStreaming) return;
    setDraft('');
    if (!activeThreadId) {
      createThread().then(() => sendMessage(body));
    } else {
      sendMessage(body);
    }
  };

  const suggestions = portal ? CLIENT_SUGGESTED_PROMPTS : SUGGESTED_PROMPTS;

  return (
    <Card className="overflow-hidden">
      <div className="flex h-[calc(100vh-260px)] min-h-[480px]">
        {/* Thread list */}
        <div className="w-72 border-r border-ink-200 flex flex-col flex-shrink-0 bg-ink-50/50">
          <div className="p-3 border-b border-ink-200">
            <Button variant="secondary" className="w-full" onClick={() => createThread()}>
              <Plus size={16} />
              New chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoadingThreads ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="p-6 text-center text-sm text-ink-400">
                <Sparkles className="mx-auto mb-2 h-6 w-6 text-ink-300" />
                Start a conversation with Brain.
              </div>
            ) : (
              threads.map((thread) => {
                const active = thread.id === activeThreadId;
                return (
                  <button
                    key={thread.id}
                    onClick={() => selectThread(thread.id)}
                    className={`group w-full text-left px-4 py-3 transition-colors border-b border-ink-100 flex items-center justify-between gap-2 ${
                      active ? 'bg-bone-50' : 'hover:bg-bone-50/60'
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-900">
                      {thread.title || 'New chat'}
                    </span>
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteThread(thread.id);
                      }}
                      className="flex-shrink-0 text-ink-300 opacity-0 group-hover:opacity-100 hover:text-terracotta-600 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeThreadId ? (
            <EmptyState suggestions={suggestions} onPick={handleSend} />
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-5 py-4 bg-bone-50 space-y-4">
                {isLoadingMessages ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-2/3" />
                    <Skeleton className="h-10 w-1/2 ml-auto" />
                  </div>
                ) : messages.length === 0 && !isStreaming ? (
                  <EmptyState suggestions={suggestions} onPick={handleSend} inline />
                ) : (
                  messages.map((message, index) => (
                    <MessageBubble key={message.id} message={message} prev={messages[index - 1]} />
                  ))
                )}

                {liveToolEvents.map((event) => (
                  <ToolChip key={event.id} event={event} />
                ))}

                {streamingText && (
                  <div className="flex justify-start">
                    <div className="max-w-[70%] text-left">
                      <div className="inline-block rounded-lg px-4 py-2.5 text-sm shadow-sm bg-bone-100 border border-ink-200 text-ink-900 rounded-bl-sm">
                        {renderMarkdownLite(streamingText)}
                        <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-ink-400 align-middle" />
                      </div>
                    </div>
                  </div>
                )}

                {isStreaming && !streamingText && liveToolEvents.length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-ink-400">
                    <Loader2 size={14} className="animate-spin" />
                    Thinking…
                  </div>
                )}

                {pendingConfirmation && (
                  <ConfirmationCard
                    description={pendingConfirmation.description}
                    onConfirm={() => confirmAction(true)}
                    onCancel={() => confirmAction(false)}
                    disabled={isStreaming}
                  />
                )}

                {error && (
                  <div className="flex items-start gap-2 rounded-md border border-terracotta-500/30 bg-terracotta-100/60 px-3.5 py-3 text-sm text-terracotta-600">
                    <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                    <span className="flex-1">{error}</span>
                    <button onClick={clearError} className="text-terracotta-500 hover:text-terracotta-700">
                      ×
                    </button>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              <div className="px-5 py-4 border-t border-ink-200">
                <div className="flex items-end gap-3">
                  <textarea
                    className="flex-1 min-h-[44px] max-h-32 resize-y rounded-sm border border-ink-300 bg-bone-50 px-3 py-2.5 text-sm placeholder:text-ink-400 focus:border-brass-500 focus:outline-none"
                    placeholder={
                      pendingConfirmation
                        ? 'Confirm or cancel the pending action above first…'
                        : 'Ask Brain anything, or tell it what to do…'
                    }
                    value={draft}
                    disabled={!!pendingConfirmation}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button
                    variant="primary"
                    size="icon"
                    className="h-[44px] w-[44px] flex-shrink-0"
                    onClick={() => handleSend()}
                    disabled={!draft.trim() || isStreaming || !!pendingConfirmation}
                  >
                    <Send size={18} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function EmptyState({
  suggestions,
  onPick,
  inline = false,
}: {
  suggestions: string[];
  onPick: (text: string) => void;
  inline?: boolean;
}) {
  return (
    <div className={inline ? 'py-8' : 'flex-1 flex items-center justify-center bg-bone-50'}>
      <div className="text-center max-w-md mx-auto px-6">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pine-800 text-bone-50">
          <Sparkles size={22} />
        </div>
        <h3 className="font-display text-lg font-medium text-ink-900 mb-1">Ask Brain anything</h3>
        <p className="text-sm text-ink-500 mb-5">
          It can answer questions about your data and take actions for you — try one of these, or type your own.
        </p>
        <div className="flex flex-col gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onPick(s)}
              className="rounded-sm border border-ink-200 bg-bone-50 px-3.5 py-2.5 text-left text-sm text-ink-700 transition-all duration-hover ease-brand hover:border-brass-400 hover:bg-ink-100"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, prev }: { message: BrainMessage; prev?: BrainMessage }) {
  const showDate = !prev || !isSameDay(new Date(prev.createdAt), new Date(message.createdAt));

  if (message.role === 'tool') {
    return (
      <div className="flex justify-start">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-xs text-ink-500">
          <Check size={12} className="text-moss-600" />
          {toolLabel(message.toolName ?? '')}
        </div>
      </div>
    );
  }

  const mine = message.role === 'user';
  if (!message.content) return null;

  return (
    <div>
      {showDate && (
        <div className="flex justify-center my-4">
          <span className="text-[11px] uppercase tracking-wide text-ink-400 bg-ink-100 rounded-full px-3 py-1">
            {format(new Date(message.createdAt), 'MMMM d, yyyy')}
          </span>
        </div>
      )}
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[70%] ${mine ? 'text-right' : 'text-left'}`}>
          <div
            className={`inline-block rounded-lg px-4 py-2.5 text-sm shadow-sm ${
              mine
                ? 'bg-pine-900 text-bone-50 rounded-br-sm'
                : 'bg-bone-100 border border-ink-200 text-ink-900 rounded-bl-sm'
            }`}
          >
            {renderMarkdownLite(message.content)}
          </div>
          <div className="text-[11px] text-ink-400 mt-1">
            {mine ? 'You' : 'Brain'} · {format(new Date(message.createdAt), 'h:mm a')}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolChip({ event }: { event: LiveToolEvent }) {
  return (
    <div className="flex justify-start">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-xs text-ink-500">
        {event.status === 'running' ? (
          <Loader2 size={12} className="animate-spin text-brass-600" />
        ) : (
          <Check size={12} className="text-moss-600" />
        )}
        {toolLabel(event.name)}
      </div>
    </div>
  );
}

function ConfirmationCard({
  description,
  onConfirm,
  onCancel,
  disabled,
}: {
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-lg border border-terracotta-400/50 bg-terracotta-100/50 px-4 py-3">
        <div className="flex items-start gap-2 mb-3">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-terracotta-600" />
          <p className="text-sm text-ink-900">{description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={disabled}>
            Yes, do it
          </Button>
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={disabled}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

export function BrainThreadIcon() {
  return <MessageSquareText size={18} />;
}
