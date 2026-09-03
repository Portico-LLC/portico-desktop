import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '@/lib/api';
import { streamArchitectMessage } from '@/lib/brainStream';
import { layoutGeneratedGraph } from '@/components/automations/architectGraphLayout';
import { ArchitectChat, type ArchitectChatMessage, type LiveToolEvent, type GraphReadyPayload } from '@/components/automations/ArchitectChat';
import type { ArchitectStreamEvent } from '@/lib/types';

export function Architect() {
  const location = useLocation();
  const navigate = useNavigate();
  const seed = (location.state as { seed?: string } | null)?.seed;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ArchitectChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [liveToolEvents, setLiveToolEvents] = useState<LiveToolEvent[]>([]);
  const [graphReady, setGraphReady] = useState<GraphReadyPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const send = async (activeSessionId: string, content: string) => {
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: 'user', content }]);
    setIsStreaming(true);
    setStreamingText('');
    setLiveToolEvents([]);
    setError(null);
    setGraphReady(null);

    const controller = new AbortController();
    abortRef.current = controller;
    let finalText = '';

    try {
      await streamArchitectMessage(
        activeSessionId,
        content,
        (event: ArchitectStreamEvent) => {
          switch (event.type) {
            case 'token':
              finalText += event.content;
              setStreamingText((t) => t + event.content);
              break;
            case 'tool_call':
              setLiveToolEvents((evts) => [...evts, { id: event.id, name: event.name, args: event.args, status: 'running' as const }]);
              break;
            case 'tool_result':
              setLiveToolEvents((evts) => evts.map((e) => (e.id === event.id ? { ...e, status: 'done' as const, result: event.result } : e)));
              break;
            case 'graph_ready':
              setGraphReady({
                trigger: event.trigger,
                nodes: event.nodes,
                edges: event.edges,
                suggestedName: event.suggestedName,
                suggestedDescription: event.suggestedDescription,
                summary: event.summary,
                warnings: event.warnings,
              });
              break;
            case 'done':
              setIsStreaming(false);
              if (finalText) setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', content: finalText }]);
              setStreamingText('');
              setLiveToolEvents([]);
              break;
            case 'error':
              setIsStreaming(false);
              setError(event.message);
              break;
          }
        },
        controller.signal,
      );
    } catch (err) {
      // A navigate-away mid-stream aborts the fetch via this same controller — that's an
      // intentional cancellation, not a failure worth surfacing (and the component may already
      // be unmounted by the time this rejects, so setState here would just warn).
      if (controller.signal.aborted) return;
      setIsStreaming(false);
      setError(getErrorMessage(err));
    }
  };

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    (async () => {
      try {
        const { data } = await api.post<{ sessionId: string }>('/automations/architect/sessions');
        setSessionId(data.sessionId);
        if (seed) await send(data.sessionId, seed);
      } catch (err) {
        setError(getErrorMessage(err));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (name: string) => {
    if (!graphReady) return;
    setCreating(true);
    setError(null);
    try {
      const nodes = layoutGeneratedGraph(graphReady.nodes, graphReady.edges);
      const { data } = await api.post<{ id: string }>('/automations', {
        name,
        description: graphReady.suggestedDescription,
        trigger: graphReady.trigger,
        nodes,
        edges: graphReady.edges,
      });
      navigate(`/automations/${data.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
      setCreating(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-medium text-ink-900">Architect</h1>
        <p className="mt-1 text-sm text-ink-500">
          Describe the automation you want — Architect looks up your real projects, clients, and team to design it, then hands you a draft to review.
        </p>
      </div>
      <ArchitectChat
        ready={!!sessionId}
        messages={messages}
        isStreaming={isStreaming}
        streamingText={streamingText}
        liveToolEvents={liveToolEvents}
        graphReady={graphReady}
        error={error}
        creating={creating}
        onSend={(content) => sessionId && send(sessionId, content)}
        onCreate={handleCreate}
        onClearError={() => setError(null)}
      />
    </div>
  );
}

export default Architect;
