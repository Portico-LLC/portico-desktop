import { create } from 'zustand';
import { api, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { streamBrainMessage, streamBrainConfirm, type BrainStreamEvent, type BrainBasePath } from '@/lib/brainStream';
import type { BrainThread, BrainMessage } from '@/lib/types';

export interface LiveToolEvent {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: 'running' | 'done';
  result?: unknown;
}

interface BrainState {
  threads: BrainThread[];
  activeThreadId: string | null;
  messages: BrainMessage[];
  isLoadingThreads: boolean;
  isLoadingMessages: boolean;
  isStreaming: boolean;
  streamingText: string;
  liveToolEvents: LiveToolEvent[];
  pendingConfirmation: BrainThread['pendingToolCall'];
  error: string | null;

  loadThreads: () => Promise<void>;
  createThread: (title?: string) => Promise<string>;
  selectThread: (id: string) => Promise<void>;
  deleteThread: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  confirmAction: (confirm: boolean) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

function basePath(): BrainBasePath {
  return useAuthStore.getState().role === 'client' ? '/client/brain' : '/brain';
}

export const useBrainStore = create<BrainState>((set, get) => {
  async function refreshThread(threadId: string) {
    if (get().activeThreadId !== threadId) return;
    try {
      const { data } = await api.get<BrainThread>(`${basePath()}/threads/${threadId}`);
      if (get().activeThreadId === threadId) {
        set({ messages: data.messages ?? [], pendingConfirmation: data.pendingToolCall ?? null });
      }
    } catch {
      // keep whatever was already rendered locally if the refresh fails
    }
  }

  function handleStreamEvent(event: BrainStreamEvent, threadId: string) {
    switch (event.type) {
      case 'token':
        set((s) => ({ streamingText: s.streamingText + event.content }));
        break;
      case 'tool_call':
        set((s) => ({
          liveToolEvents: [
            ...s.liveToolEvents,
            { id: event.id, name: event.name, args: event.args, status: 'running' as const },
          ],
        }));
        break;
      case 'tool_result':
        set((s) => ({
          liveToolEvents: s.liveToolEvents.map((e) =>
            e.id === event.id ? { ...e, status: 'done' as const, result: event.result } : e,
          ),
        }));
        break;
      case 'confirmation_required':
        set({
          pendingConfirmation: {
            toolCallId: event.toolCallId,
            name: event.name,
            args: event.args,
            description: event.description,
          },
          isStreaming: false,
        });
        break;
      case 'done':
        set({ isStreaming: false, streamingText: '', liveToolEvents: [] });
        void refreshThread(threadId);
        break;
      case 'error':
        set({ isStreaming: false, error: event.message });
        break;
    }
  }

  return {
    threads: [],
    activeThreadId: null,
    messages: [],
    isLoadingThreads: false,
    isLoadingMessages: false,
    isStreaming: false,
    streamingText: '',
    liveToolEvents: [],
    pendingConfirmation: null,
    error: null,

    loadThreads: async () => {
      set({ isLoadingThreads: true, error: null });
      try {
        const { data } = await api.get<BrainThread[]>(`${basePath()}/threads`);
        set({ threads: data });
      } catch (err) {
        set({ error: getErrorMessage(err) });
      } finally {
        set({ isLoadingThreads: false });
      }
    },

    createThread: async (title) => {
      const { data } = await api.post<BrainThread>(`${basePath()}/threads`, { title });
      set((s) => ({ threads: [data, ...s.threads] }));
      await get().selectThread(data.id);
      return data.id;
    },

    selectThread: async (id) => {
      set({
        activeThreadId: id,
        isLoadingMessages: true,
        streamingText: '',
        liveToolEvents: [],
        pendingConfirmation: null,
        error: null,
      });
      try {
        const { data } = await api.get<BrainThread>(`${basePath()}/threads/${id}`);
        set({ messages: data.messages ?? [], pendingConfirmation: data.pendingToolCall ?? null });
      } catch (err) {
        set({ error: getErrorMessage(err) });
      } finally {
        set({ isLoadingMessages: false });
      }
    },

    deleteThread: async (id) => {
      await api.delete(`${basePath()}/threads/${id}`);
      set((s) => ({
        threads: s.threads.filter((t) => t.id !== id),
        ...(s.activeThreadId === id
          ? { activeThreadId: null, messages: [], pendingConfirmation: null, streamingText: '', liveToolEvents: [] }
          : {}),
      }));
    },

    sendMessage: async (content) => {
      const threadId = get().activeThreadId;
      if (!threadId) return;

      const optimisticUser: BrainMessage = {
        id: `optimistic-${Date.now()}`,
        threadId,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      };
      set((s) => ({
        messages: [...s.messages, optimisticUser],
        isStreaming: true,
        streamingText: '',
        liveToolEvents: [],
        error: null,
      }));

      try {
        await streamBrainMessage(basePath(), threadId, content, (event) => handleStreamEvent(event, threadId));
      } catch (err) {
        set({ error: getErrorMessage(err), isStreaming: false });
      }
    },

    confirmAction: async (confirm) => {
      const threadId = get().activeThreadId;
      if (!threadId) return;
      set({ isStreaming: true, streamingText: '', pendingConfirmation: null, error: null });
      try {
        await streamBrainConfirm(basePath(), threadId, confirm, (event) => handleStreamEvent(event, threadId));
      } catch (err) {
        set({ error: getErrorMessage(err), isStreaming: false });
      }
    },

    clearError: () => set({ error: null }),

    reset: () =>
      set({
        threads: [],
        activeThreadId: null,
        messages: [],
        isStreaming: false,
        streamingText: '',
        liveToolEvents: [],
        pendingConfirmation: null,
        error: null,
      }),
  };
});
