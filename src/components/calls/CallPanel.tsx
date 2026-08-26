import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Phone, PhoneOff, Loader2, AlertCircle, Video, ChevronDown, ChevronUp, Link2, Mic } from 'lucide-react';
import { api } from '@/lib/api';
import { useActiveCallStore } from '@/store/activeCall';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils';
import type { Call, CallPlatform } from '@/lib/types';

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
 * Call assistant. Records the employee's mic and the call's system audio
 * locally as two separate tracks (see lib/calls/audioCapture) and uploads
 * them for transcription once the call ends — no live streaming, no
 * realtime API. The call lifecycle itself lives in store/activeCall.ts, not
 * here — see that file for why. See PORTICO_MEETING_BOT_PLAN for the
 * architecture.
 */
export function CallPanel({ projectId, clientId, projectName, className }: CallPanelProps) {
  const queryClient = useQueryClient();
  const [joinFormOpen, setJoinFormOpen] = useState(false);

  // Call lifecycle lives in a module-level store, not component state — see
  // store/activeCall.ts for why (CallPanel remounting mid-call was silently
  // killing calls when this state lived in useRef/useState here).
  const status = useActiveCallStore((s) => s.status);
  const error = useActiveCallStore((s) => s.error);
  const elapsedSeconds = useActiveCallStore((s) => s.elapsedSeconds);
  const storeStartCall = useActiveCallStore((s) => s.startCall);
  const storeEndCall = useActiveCallStore((s) => s.endCall);

  const historyQuery = useQuery({
    queryKey: ['calls', projectId],
    queryFn: () => api.get<Call[]>('/calls', { params: { projectId } }).then((res) => res.data),
    staleTime: 10_000,
    enabled: status === 'idle',
  });

  const startCall = useCallback(async () => {
    await storeStartCall(projectId, clientId);
  }, [storeStartCall, projectId, clientId]);

  const endCall = useCallback(async () => {
    await storeEndCall();
    queryClient.invalidateQueries({ queryKey: ['calls', projectId] });
  }, [storeEndCall, queryClient, projectId]);

  const [joinPlatform, setJoinPlatform] = useState<Exclude<CallPlatform, 'desktop'>>('google_meet');
  const [joinUrl, setJoinUrl] = useState('');
  const [joinSubmitting, setJoinSubmitting] = useState(false);

  const joinExternalCall = useCallback(async () => {
    if (!joinUrl.trim()) return;
    setJoinSubmitting(true);
    useActiveCallStore.setState({ error: null });
    try {
      await api.post('/calls/external', { projectId, clientId, platform: joinPlatform, meetingUrl: joinUrl.trim() });
      setJoinUrl('');
      setJoinFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['calls', projectId] });
    } catch (err) {
      useActiveCallStore.setState({ error: err instanceof Error ? err.message : 'Could not dispatch the meeting bot.' });
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
                Recording · {formatElapsed(elapsedSeconds)}
              </span>
            ) : status === 'connecting' ? (
              'Connecting…'
            ) : status === 'ending' ? (
              'Processing transcript…'
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
            A bot joins, records the whole call, and a summary appears here once it's done.
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

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {status === 'idle' && <CallHistoryList calls={historyQuery.data ?? []} isLoading={historyQuery.isLoading} />}
        {status === 'active' && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-terracotta-100">
              <Mic size={20} className="animate-pulse text-terracotta-500" />
            </span>
            <p className="text-sm font-medium text-ink-700">Recording your mic and this call's audio</p>
            <p className="max-w-[220px] text-xs text-ink-400">
              The transcript and summary will appear in Recent calls once you end the call.
            </p>
          </div>
        )}
        {status === 'ending' && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Loader2 size={20} className="animate-spin text-ink-400" />
            <p className="text-sm font-medium text-ink-700">Transcribing the call…</p>
            <p className="max-w-[220px] text-xs text-ink-400">This can take a moment for longer calls.</p>
          </div>
        )}
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
            {call.externalTranscriptText ? (
              <p className="max-h-64 overflow-y-auto whitespace-pre-line text-xs text-ink-600">
                {call.externalTranscriptText}
              </p>
            ) : (
              <p className="text-xs text-ink-400">
                {call.status === 'failed' ? 'This call failed before a transcript was produced.' : 'No transcript available.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
