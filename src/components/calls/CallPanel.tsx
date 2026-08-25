import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  Phone,
  PhoneOff,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckSquare,
  Video,
  ChevronDown,
  ChevronUp,
  Link2,
} from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils';
import { useCallAudioStream, type CallTrack } from '@/hooks/useCallAudioStream';
import type { Call, CallSpeaker, CallPlatform, CallTranscriptChunk } from '@/lib/types';

interface BotAction {
  responseText: string;
  actions: { toolName: string; taskId?: string }[];
}

interface TranscriptEntry {
  id: string;
  speaker: CallSpeaker;
  text: string;
  botAction?: BotAction;
}

type CallPanelStatus = 'idle' | 'connecting' | 'active' | 'ending' | 'error';

interface CallPanelProps {
  projectId: string;
  clientId?: string;
  projectName?: string;
  className?: string;
}

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const ACTION_LABELS: Record<string, string> = {
  create_task: 'Created a task',
  update_task: 'Updated a task',
  send_message: 'Sent a message',
};

const EXTERNAL_PLATFORMS: { value: Exclude<CallPlatform, 'desktop'>; label: string }[] = [
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'microsoft_teams', label: 'Microsoft Teams' },
];

const PLATFORM_LABELS: Record<CallPlatform, string> = {
  desktop: 'Desktop call',
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  microsoft_teams: 'Microsoft Teams',
};

const STATUS_BADGE: Record<Call['status'], { label: string; variant: 'neutral' | 'pine' | 'ochre' | 'terracotta' }> = {
  pending: { label: 'Joining…', variant: 'ochre' },
  active: { label: 'Live', variant: 'pine' },
  ended: { label: 'Completed', variant: 'neutral' },
  failed: { label: 'Failed', variant: 'terracotta' },
};

/**
 * Live call assistant. Speaks to the /calls socket gateway, streaming two
 * separate PCM audio tracks (mic = employee, system = client — see
 * useCallAudioStream) and rendering the transcript + any PlaybookEngine
 * actions as they arrive. See PORTICO_MEETING_BOT_PLAN for the architecture.
 */
export function CallPanel({ projectId, clientId, projectName, className }: CallPanelProps) {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<CallPanelStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [joinFormOpen, setJoinFormOpen] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const callIdRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const historyQuery = useQuery({
    queryKey: ['calls', projectId],
    queryFn: () => api.get<Call[]>('/calls', { params: { projectId } }).then((res) => res.data),
    staleTime: 10_000,
    enabled: status === 'idle',
  });

  const handleAudioError = useCallback((message: string) => {
    setError(message);
    setStatus('error');
  }, []);

  const handlePcmChunk = useCallback((track: CallTrack, pcm: ArrayBuffer) => {
    const callId = callIdRef.current;
    const socket = socketRef.current;
    if (!callId || !socket?.connected) return;
    socket.emit('audio:chunk', { callId, track, pcm });
  }, []);

  const audio = useCallAudioStream({ onPcmChunk: handlePcmChunk, onError: handleAudioError });

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    if (status !== 'active') return;
    const interval = window.setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(interval);
  }, [status]);

  const cleanupSocket = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  // Safety net if the component unmounts mid-call (e.g. the panel tab is
  // switched away) — without this the mic/system tracks and socket stay open.
  useEffect(
    () => () => {
      console.log('[call] CallPanel unmounting — tearing down audio/socket as a safety net');
      audio.stop();
      cleanupSocket();
    },
    [audio, cleanupSocket],
  );

  const startCall = useCallback(async () => {
    setStatus('connecting');
    setError(null);
    setTranscript([]);
    setElapsedSeconds(0);
    try {
      console.log('[call] creating call row…');
      const { data: created } = await api.post<Call>('/calls', { projectId, clientId });
      callIdRef.current = created.id;
      console.log('[call] created', created.id);

      const socket = io(`${API_URL}/calls`, { auth: { token }, autoConnect: true });
      socketRef.current = socket;
      socket.on('disconnect', (reason) => console.log('[call] socket disconnected, reason:', reason));
      await new Promise<void>((resolve, reject) => {
        socket.once('connect', () => resolve());
        socket.once('connect_error', (err) => reject(err));
      });
      console.log('[call] socket connected, id:', socket.id);

      socket.on('transcript:chunk', (chunk: { id: string; speaker: CallSpeaker; text: string }) => {
        setTranscript((prev) => [...prev, { id: chunk.id, speaker: chunk.speaker, text: chunk.text }]);
      });
      socket.on('call:bot-action', (payload: { chunkId: string } & BotAction) => {
        setTranscript((prev) =>
          prev.map((entry) =>
            entry.id === payload.chunkId
              ? { ...entry, botAction: { responseText: payload.responseText, actions: payload.actions } }
              : entry,
          ),
        );
      });
      socket.on('call:error', (payload: { message: string }) => {
        console.error('[call] call:error from server:', payload);
        setError(payload.message);
      });

      socket.emit('call:join', { callId: created.id });
      console.log('[call] call:join emitted');
      await api.post(`/calls/${created.id}/start`);
      console.log('[call] /start acked, requesting mic + system audio…');
      await audio.start();
      console.log('[call] audio.start() resolved, audio state:', audio.state);
      setStatus('active');
    } catch (err) {
      console.error('[call] startCall failed:', err);
      setError(err instanceof Error ? err.message : 'Could not start the call.');
      setStatus('error');
      audio.stop();
      cleanupSocket();
      callIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, clientId, token]);

  const endCall = useCallback(async () => {
    setStatus('ending');
    audio.stop();
    const callId = callIdRef.current;
    socketRef.current?.emit('call:leave', { callId });
    cleanupSocket();
    if (callId) await api.post(`/calls/${callId}/end`).catch(() => {});
    callIdRef.current = null;
    setStatus('idle');
    queryClient.invalidateQueries({ queryKey: ['calls', projectId] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const [joinPlatform, setJoinPlatform] = useState<Exclude<CallPlatform, 'desktop'>>('google_meet');
  const [joinUrl, setJoinUrl] = useState('');
  const [joinSubmitting, setJoinSubmitting] = useState(false);

  const joinExternalCall = useCallback(async () => {
    if (!joinUrl.trim()) return;
    setJoinSubmitting(true);
    setError(null);
    try {
      await api.post('/calls/external', { projectId, clientId, platform: joinPlatform, meetingUrl: joinUrl.trim() });
      setJoinUrl('');
      setJoinFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['calls', projectId] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not dispatch the meeting bot.');
    } finally {
      setJoinSubmitting(false);
    }
  }, [joinUrl, joinPlatform, projectId, clientId, queryClient]);

  const isBusy = status === 'connecting' || status === 'ending';

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-ink-200 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-900">{projectName || 'Call assistant'}</p>
          <p className="text-xs text-ink-400">
            {status === 'active' ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-terracotta-500" />
                Live · {formatElapsed(elapsedSeconds)}
              </span>
            ) : status === 'connecting' ? (
              'Connecting…'
            ) : status === 'ending' ? (
              'Ending…'
            ) : (
              'Not on a call'
            )}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {status === 'active' ? (
            <Button variant="destructive" size="sm" onClick={endCall} disabled={isBusy}>
              <PhoneOff size={14} />
              End
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setJoinFormOpen((v) => !v)}
                disabled={isBusy}
                title="Join an external Google Meet, Zoom, or Teams call"
              >
                <Link2 size={14} />
              </Button>
              <Button variant="primary" size="sm" onClick={startCall} disabled={isBusy}>
                {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />}
                {isBusy ? 'Working…' : 'Start call'}
              </Button>
            </>
          )}
        </div>
      </div>

      {joinFormOpen && status === 'idle' && (
        <div className="flex-shrink-0 space-y-2 border-b border-ink-200 bg-ink-50 px-4 py-3">
          <p className="text-xs font-medium text-ink-700">Join an external meeting</p>
          <p className="text-[11px] text-ink-400">
            A bot joins, records the whole call, and a summary appears here once it's done — no live transcript for
            external calls.
          </p>
          <div className="flex gap-2">
            <Select
              value={joinPlatform}
              onChange={(e) => setJoinPlatform(e.target.value as Exclude<CallPlatform, 'desktop'>)}
              className="w-36 flex-shrink-0"
            >
              {EXTERNAL_PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
            <Input
              value={joinUrl}
              onChange={(e) => setJoinUrl(e.target.value)}
              placeholder="Meeting URL"
              className="flex-1"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={joinExternalCall} disabled={joinSubmitting || !joinUrl.trim()}>
            {joinSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
            Dispatch bot
          </Button>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-md border border-terracotta-500/30 bg-terracotta-100/60 px-3 py-2.5 text-xs text-terracotta-600">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {status === 'idle' && transcript.length === 0 && (
          <CallHistoryList calls={historyQuery.data ?? []} isLoading={historyQuery.isLoading} />
        )}
        {transcript.map((entry) => (
          <div key={entry.id} className={cn('flex flex-col', entry.speaker === 'employee' ? 'items-end' : 'items-start')}>
            <div
              className={cn(
                'max-w-[85%] rounded-md px-3 py-2 text-sm',
                entry.speaker === 'employee' ? 'bg-pine-100 text-pine-800' : 'bg-ink-100 text-ink-900',
              )}
            >
              <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide opacity-60">
                {entry.speaker === 'employee' ? 'You' : 'Client'}
              </p>
              {entry.text}
            </div>

            {entry.botAction && (entry.botAction.responseText || entry.botAction.actions.length > 0) && (
              <div className="mt-1.5 flex max-w-[85%] items-start gap-2 rounded-md border border-brass-200 bg-brass-50 px-3 py-2 text-xs text-brass-800">
                <Sparkles size={13} className="mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  {entry.botAction.responseText && <p>{entry.botAction.responseText}</p>}
                  {entry.botAction.actions.map((action, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <Badge variant="brass" className="gap-1">
                        <CheckSquare size={10} />
                        {ACTION_LABELS[action.toolName] ?? action.toolName}
                      </Badge>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CallHistoryList({ calls, isLoading }: { calls: Call[]; isLoading: boolean }) {
  if (isLoading) {
    return <p className="pt-6 text-center text-sm text-ink-400">Loading recent calls…</p>;
  }
  if (calls.length === 0) {
    return (
      <p className="pt-6 text-center text-sm text-ink-400">
        Start a call, or join an external meeting, to see it here.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Recent calls</p>
      {calls.map((call) => (
        <CallHistoryRow key={call.id} call={call} />
      ))}
    </div>
  );
}

function CallHistoryRow({ call }: { call: Call }) {
  const [expanded, setExpanded] = useState(false);
  const badge = STATUS_BADGE[call.status];

  // Desktop calls' transcript lives as CallTranscriptChunk rows, not on the
  // Call itself — fetch it lazily, only once this row is actually opened,
  // rather than pulling every past call's full transcript up front.
  const transcriptQuery = useQuery({
    queryKey: ['call-transcript', call.id],
    queryFn: () => api.get<CallTranscriptChunk[]>(`/calls/${call.id}/transcript`).then((res) => res.data),
    enabled: expanded && call.platform === 'desktop',
    staleTime: Infinity, // a past call's transcript never changes once it's ended
  });

  return (
    <div className="rounded-md border border-ink-200 bg-bone-50">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-ink-900">{PLATFORM_LABELS[call.platform]}</p>
          <p className="text-[11px] text-ink-400">{formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          {expanded ? <ChevronUp size={14} className="text-ink-400" /> : <ChevronDown size={14} className="text-ink-400" />}
        </div>
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-ink-100 px-3 py-2.5">
          {call.summary && (
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-ink-400">Summary</p>
              <p className="text-xs text-ink-600">{call.summary}</p>
            </div>
          )}

          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-ink-400">Transcript</p>
            {call.platform === 'desktop' ? (
              transcriptQuery.isLoading ? (
                <p className="text-xs text-ink-400">Loading…</p>
              ) : transcriptQuery.data?.length ? (
                <div className="max-h-64 space-y-1.5 overflow-y-auto">
                  {transcriptQuery.data.map((chunk) => (
                    <p key={chunk.id} className="text-xs text-ink-600">
                      <span className="font-medium text-ink-800">{chunk.speaker === 'employee' ? 'You' : 'Client'}:</span>{' '}
                      {chunk.text}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-400">No transcript available.</p>
              )
            ) : call.externalTranscriptText ? (
              <p className="max-h-64 overflow-y-auto whitespace-pre-line text-xs text-ink-600">
                {call.externalTranscriptText}
              </p>
            ) : (
              <p className="text-xs text-ink-400">
                {call.status === 'failed' ? 'This call failed before a transcript was produced.' : 'No transcript available yet.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
