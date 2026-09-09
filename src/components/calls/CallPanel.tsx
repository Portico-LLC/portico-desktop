import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Phone, PhoneOff, Loader2, AlertCircle, Video, ChevronDown, ChevronUp, Link2, Mic, Radio, X, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useActiveCallStore } from '@/store/activeCall';
import { useLiveTranscriptStore } from '@/store/liveTranscript';
import { LiveTranscript } from '@/components/calls/LiveTranscript';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils';
import type { Call, CallPlatform } from '@/lib/types';
import type { MeetingDetection } from '@/types/electron';

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
 * Call assistant. Records the employee's mic and the call's system audio locally
 * as two separate tracks (see lib/calls/audioCapture) and uploads them when the
 * call ends. Where live transcription is configured, the same streams are also
 * tapped for a realtime transcript (store/liveTranscript.ts); where it isn't, the
 * post-call batch transcription is the whole story and this panel just shows the
 * recording state.
 *
 * The call lifecycle itself lives in store/activeCall.ts, not here — see that
 * file for why.
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
  // False whenever Deepgram isn't configured or the live session failed to open —
  // the call still records and is transcribed after the fact, so this only
  // decides whether a live transcript is worth showing.
  const liveAvailable = useLiveTranscriptStore((s) => s.available);

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
  const [detection, setDetection] = useState<MeetingDetection | null>(null);

  useEffect(() => {
    const calls = window.portico?.calls;
    if (!calls) return;
    return calls.onMeetingDetected((next) => setDetection(next));
  }, []);

  // Detection is pointless while a call is already running, and polling window
  // titles next to a live transcription session is just wasted CPU.
  useEffect(() => {
    window.portico?.calls?.setCallActive(status === 'active' || status === 'connecting');
  }, [status]);

  const dismissDetection = useCallback(() => {
    if (detection) window.portico?.calls?.dismissDetection(detection.key);
    setDetection(null);
  }, [detection]);

  const startFromDetection = useCallback(async () => {
    setDetection(null);
    await startCall();
  }, [startCall]);

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

      {detection && status === 'idle' && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-md border border-brass-500/30 bg-brass-100/50 px-3 py-2.5">
          <Radio size={14} className="flex-shrink-0 text-brass-600" />
          <p className="min-w-0 flex-1 text-xs text-ink-700">
            <span className="font-medium">{detection.label}</span> call detected
          </p>
          <Button variant="secondary" size="sm" onClick={startFromDetection} disabled={isBusy}>
            Record
          </Button>
          <button
            type="button"
            onClick={dismissDetection}
            className="flex-shrink-0 cursor-pointer text-ink-400 hover:text-ink-600"
            title="Not now"
          >
            <X size={14} />
          </button>
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
        {status === 'active' &&
          (liveAvailable ? (
            <LiveTranscript className="h-full" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-terracotta-100">
                <Mic size={20} className="animate-pulse text-terracotta-500" />
              </span>
              <p className="text-sm font-medium text-ink-700">Recording your mic and this call's audio</p>
              <p className="max-w-[220px] text-xs text-ink-400">
                The transcript and summary will appear in Recent calls once you end the call.
              </p>
            </div>
          ))}
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

/**
 * The digest's decisions and risks are read-only records of what was said. Its
 * action items are proposals only — the summarizer runs with no tools at all, so
 * nothing reaches a project until someone ticks a box here and presses the button.
 */
function CallDigestReview({ call }: { call: Call }) {
  const queryClient = useQueryClient();
  const digest = call.digest!;
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const confirmed = !!call.actionsConfirmedAt;

  const toggle = (index: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const confirm = async () => {
    if (!checked.size) return;
    setSubmitting(true);
    try {
      await api.post(`/calls/${call.id}/actions/confirm`, { indexes: [...checked] });
      queryClient.invalidateQueries({ queryKey: ['calls', call.projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {digest.decisions.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-ink-400">Decisions</p>
          <ul className="space-y-0.5">
            {digest.decisions.map((d, i) => (
              <li key={i} className="text-xs text-ink-600">
                • {d.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {digest.risks.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-ink-400">Risks</p>
          <ul className="space-y-0.5">
            {digest.risks.map((r, i) => (
              <li key={i} className="text-xs text-ink-600">
                <span className={cn('font-medium', r.severity === 'high' ? 'text-terracotta-600' : 'text-ochre-600')}>
                  {r.severity}
                </span>{' '}
                — {r.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {digest.actionItems.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-ink-400">
            Action items {confirmed && <span className="text-pine-600">· added</span>}
          </p>
          <div className="space-y-1">
            {digest.actionItems.map((item, i) => (
              <label
                key={i}
                className={cn('flex items-start gap-2 text-xs text-ink-600', !confirmed && 'cursor-pointer')}
              >
                <input
                  type="checkbox"
                  disabled={confirmed || submitting}
                  checked={checked.has(i)}
                  onChange={() => toggle(i)}
                  className="mt-0.5 accent-pine-600"
                />
                <span className="min-w-0">
                  {item.title}
                  {(item.ownerHint || item.dueDateHint) && (
                    <span className="text-ink-400">
                      {' '}
                      ({[item.ownerHint, item.dueDateHint].filter(Boolean).join(', ')})
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
          {!confirmed && (
            <Button variant="secondary" size="sm" className="mt-2" onClick={confirm} disabled={!checked.size || submitting}>
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {checked.size ? `Create ${checked.size} task${checked.size > 1 ? 's' : ''}` : 'Select items'}
            </Button>
          )}
        </div>
      )}
    </>
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

          {call.digest && <CallDigestReview call={call} />}

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
