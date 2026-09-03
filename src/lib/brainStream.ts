import { API_URL } from './api';
import type { ArchitectStreamEvent } from './types';

export type BrainStreamEvent =
  | { type: 'token'; content: string }
  | { type: 'tool_call'; id: string; name: string; args: Record<string, unknown> }
  | { type: 'tool_result'; id: string; name: string; result: unknown }
  | {
      type: 'confirmation_required';
      toolCallId: string;
      name: string;
      args: Record<string, unknown>;
      description: string;
    }
  | { type: 'done' }
  | { type: 'error'; message: string };

function readToken(): string | null {
  return localStorage.getItem('portico_token') || sessionStorage.getItem('portico_token');
}

/** Generic raw-fetch SSE consumer — bearer auth, buffers on `\n\n`, parses a discriminated
 *  union, invokes a callback per event. Shared by Brain chat and Architect's chat, which have
 *  different event unions but an identical wire format. */
export async function streamPost<TEvent = BrainStreamEvent>(
  path: string,
  body: unknown,
  onEvent: (event: TEvent | { type: 'error'; message: string }) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = readToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    let message = text || `Request failed (${res.status})`;
    try {
      const parsed = JSON.parse(text) as { message?: string | string[] };
      message = Array.isArray(parsed.message) ? parsed.message[0] : parsed.message || message;
    } catch {
      // plain-text error body, use as-is
    }
    onEvent({ type: 'error', message });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      if (!chunk.startsWith('data: ')) continue;
      try {
        const event = JSON.parse(chunk.slice(6)) as TEvent;
        onEvent(event);
      } catch {
        // ignore malformed SSE chunk
      }
    }
  }
}

export type BrainBasePath = '/brain' | '/client/brain';

export function streamBrainMessage(
  basePath: BrainBasePath,
  threadId: string,
  content: string,
  onEvent: (event: BrainStreamEvent) => void,
  signal?: AbortSignal,
) {
  return streamPost(`${basePath}/threads/${threadId}/messages`, { content }, onEvent, signal);
}

export function streamBrainConfirm(
  basePath: BrainBasePath,
  threadId: string,
  confirm: boolean,
  onEvent: (event: BrainStreamEvent) => void,
  signal?: AbortSignal,
) {
  return streamPost(`${basePath}/threads/${threadId}/confirm`, { confirm }, onEvent, signal);
}

export function streamArchitectMessage(
  sessionId: string,
  content: string,
  onEvent: (event: ArchitectStreamEvent) => void,
  signal?: AbortSignal,
) {
  return streamPost<ArchitectStreamEvent>(`/automations/architect/sessions/${sessionId}/messages`, { content }, onEvent, signal);
}
