import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Loader2, Check, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { renderMarkdownLite } from '@/lib/chatMarkdown';
import type { ArchitectGeneratedNode, WorkflowEdgeConfig, WorkflowTriggerConfig } from '@/lib/types';

export interface ArchitectChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface LiveToolEvent {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: 'running' | 'done';
  result?: unknown;
}

export interface GraphReadyPayload {
  trigger: WorkflowTriggerConfig;
  nodes: ArchitectGeneratedNode[];
  edges: WorkflowEdgeConfig[];
  suggestedName: string;
  suggestedDescription?: string;
  summary: string;
  warnings: string[];
}

const SUGGESTED_PROMPTS = [
  'When a task is created on a project, notify the assignee',
  'When an invoice goes overdue, message the client to follow up',
  'Every Monday at 9am, remind me to review open tasks',
];

/** Architect only ever sees its own read-only tool subset plus the internal
 *  `signal_ready_to_finalize` step — a narrower map than Brain's own `toolLabel`. */
function toolLabel(name: string): string {
  const map: Record<string, string> = {
    list_tasks: 'Looking up tasks',
    get_task: 'Reading task details',
    list_projects: 'Looking up projects',
    get_project: 'Reading project details',
    list_clients: 'Looking up clients',
    get_client: 'Reading client details',
    list_invoices: 'Looking up invoices',
    get_invoice: 'Reading invoice details',
    list_conversations: 'Looking up conversations',
    get_team_capacity: 'Looking up the team',
    get_project_risk: 'Checking project risk',
    signal_ready_to_finalize: 'Designing the workflow',
  };
  return map[name] ?? name.replace(/_/g, ' ');
}

export function ArchitectChat({
  ready,
  messages,
  isStreaming,
  streamingText,
  liveToolEvents,
  graphReady,
  error,
  creating,
  onSend,
  onCreate,
  onClearError,
}: {
  ready: boolean;
  messages: ArchitectChatMessage[];
  isStreaming: boolean;
  streamingText: string;
  liveToolEvents: LiveToolEvent[];
  graphReady: GraphReadyPayload | null;
  error: string | null;
  creating: boolean;
  onSend: (content: string) => void;
  onCreate: (name: string) => void;
  onClearError: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [name, setName] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (graphReady) setName(graphReady.suggestedName);
  }, [graphReady]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, streamingText, liveToolEvents.length, graphReady]);

  const handleSend = (text?: string) => {
    const body = (text ?? draft).trim();
    if (!body || isStreaming || !ready) return;
    setDraft('');
    onSend(body);
  };

  const showEmptyState = messages.length === 0 && !isStreaming;

  return (
    <Card className="overflow-hidden">
      <div className="flex h-[calc(100vh-260px)] min-h-[480px] flex-col">
        <div className="flex-1 overflow-y-auto px-5 py-4 bg-bone-50 space-y-4">
          {showEmptyState ? (
            <EmptyState onPick={handleSend} />
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
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

          {graphReady && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg border border-pine-400/40 bg-pine-500/5 px-4 py-3.5">
                <p className="mb-3 text-sm text-ink-900">{graphReady.summary}</p>

                {graphReady.warnings.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    {graphReady.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-md border border-terracotta-500/30 bg-terracotta-100/60 px-3 py-2 text-xs text-terracotta-700">
                        <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mb-3 space-y-1.5">
                  <Label htmlFor="architect-name">Automation name</Label>
                  <Input id="architect-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <Button onClick={() => onCreate(name)} disabled={creating || !name.trim()}>
                  {creating ? 'Creating…' : 'Create automation'}
                </Button>
                <p className="mt-2 text-xs text-ink-400">Lands as a draft — nothing runs until you review and activate it.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-terracotta-500/30 bg-terracotta-100/60 px-3.5 py-3 text-sm text-terracotta-600">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={onClearError} className="text-terracotta-500 hover:text-terracotta-700">
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
              placeholder="Describe the automation you want…"
              value={draft}
              disabled={!ready}
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
              disabled={!draft.trim() || isStreaming || !ready}
            >
              <Send size={18} />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-bone-50 py-8">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pine-800 text-bone-50">
          <Sparkles size={22} />
        </div>
        <h3 className="font-display text-lg font-medium text-ink-900 mb-1">Describe your automation</h3>
        <p className="text-sm text-ink-500 mb-5">
          Architect looks up your real projects, clients, and team to design a complete workflow — try one of these, or type your own.
        </p>
        <div className="flex flex-col gap-2">
          {SUGGESTED_PROMPTS.map((s) => (
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

function MessageBubble({ message }: { message: ArchitectChatMessage }) {
  const mine = message.role === 'user';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] ${mine ? 'text-right' : 'text-left'}`}>
        <div
          className={`inline-block rounded-lg px-4 py-2.5 text-sm shadow-sm ${
            mine ? 'bg-pine-900 text-bone-50 rounded-br-sm' : 'bg-bone-100 border border-ink-200 text-ink-900 rounded-bl-sm'
          }`}
        >
          {renderMarkdownLite(message.content)}
        </div>
      </div>
    </div>
  );
}

function ToolChip({ event }: { event: LiveToolEvent }) {
  return (
    <div className="flex justify-start">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-xs text-ink-500">
        {event.status === 'running' ? <Loader2 size={12} className="animate-spin text-brass-600" /> : <Check size={12} className="text-moss-600" />}
        {toolLabel(event.name)}
      </div>
    </div>
  );
}
