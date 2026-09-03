import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Loader2, Send } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { TeamTabs } from '@/components/team/TeamTabs';
import { StepList } from '@/components/team/onboarding/StepList';
import { StepEditor } from '@/components/team/onboarding/StepEditor';
import { StepPreview } from '@/components/team/onboarding/StepPreview';
import { ReaderProgressPanel } from '@/components/team/onboarding/ReaderProgressPanel';
import { fetchFlow, publishFlow, saveFlowDraft, type FlowAudience } from '@/lib/onboarding/api';
import type { StudioStep } from '@/lib/onboarding/types';
import { useAuthStore } from '@/store/auth';
import { motionTransition, springs } from '@/lib/motion/springs';

const AUDIENCES: { id: FlowAudience; label: string }[] = [
  { id: 'employee', label: 'Employees' },
  { id: 'client', label: 'Clients' },
];

const AUTOSAVE_MS = 900;

function blankStep(): StudioStep {
  return {
    id: crypto.randomUUID(),
    title: '',
    body: { type: 'doc', content: [{ type: 'paragraph' }] },
    anchorId: null,
    mediaDocumentId: null,
    isTask: false,
  };
}

/**
 * Where a studio writes its own onboarding — separate from Portico's built-in walkthrough,
 * which explains the product. This one explains *the studio*: how they run projects, what a new
 * hire should read first, what a new client should expect.
 */
export function TeamOnboarding() {
  const queryClient = useQueryClient();
  const reduce = !!useReducedMotion();
  const enabledModules = useAuthStore((s) => s.user?.enabledModules);

  const [audience, setAudience] = useState<FlowAudience>('employee');
  const [steps, setSteps] = useState<StudioStep[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const queryKey = ['onboarding', 'flow', audience];
  const { data: flow, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchFlow(audience),
  });

  // The server copy seeds local state once per audience. After that the builder owns the array
  // so typing is never fighting a refetch.
  useEffect(() => {
    if (!flow) return;
    setSteps(flow.draftSteps);
    setSelectedId(flow.draftSteps[0]?.id ?? null);
    setDirty(false);
  }, [flow?.id, flow?.audience]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: (nextSteps: StudioStep[]) => saveFlowDraft(audience, { draftSteps: nextSteps }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, updated);
      setDirty(false);
    },
    // Autosave fires constantly; a toast per keystroke pause would be noise. The header's
    // saved indicator carries this instead. Failures still surface.
    meta: { errorTitle: 'Could not save your changes' },
  });

  const setEnabled = useMutation({
    mutationFn: (isEnabled: boolean) => saveFlowDraft(audience, { isEnabled }),
    onSuccess: (updated) => queryClient.setQueryData(queryKey, updated),
    meta: { errorTitle: 'Could not update this flow' },
  });

  const publish = useMutation({
    mutationFn: () => publishFlow(audience),
    onSuccess: (updated) => queryClient.setQueryData(queryKey, updated),
    meta: {
      successMessage: 'Published',
      successDescription: 'New people will see this the next time they sign in.',
      errorTitle: 'Could not publish',
    },
  });

  // Debounced autosave. A builder that needs an explicit Save is a builder that loses work.
  const timerRef = useRef<number | undefined>(undefined);
  const commit = useCallback(
    (next: StudioStep[]) => {
      setSteps(next);
      setDirty(true);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => save.mutate(next), AUTOSAVE_MS);
    },
    [save],
  );
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const selected = steps.find((s) => s.id === selectedId) ?? null;

  const patchSelected = (patch: Partial<StudioStep>) => {
    if (!selectedId) return;
    commit(steps.map((s) => (s.id === selectedId ? { ...s, ...patch } : s)));
  };

  const addStep = () => {
    const step = blankStep();
    commit([...steps, step]);
    setSelectedId(step.id);
  };

  const deleteStep = (id: string) => {
    const next = steps.filter((s) => s.id !== id);
    commit(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  };

  const hasUnpublishedChanges = useMemo(() => {
    if (!flow) return false;
    return JSON.stringify(flow.publishedSteps) !== JSON.stringify(steps);
  }, [flow, steps]);

  const isLive = !!flow && flow.publishedVersion > 0 && flow.isEnabled;

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="mb-2 h-8 w-32" />
        <Skeleton className="mb-8 h-4 w-72" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 font-display text-4xl font-semibold text-ink-900">Team</h1>
          <p className="text-ink-500">
            Write the onboarding your new people see the first time they sign in.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SaveIndicator saving={save.isPending} dirty={dirty} reduce={reduce} />
          <Button
            variant="primary"
            disabled={publish.isPending || steps.length === 0 || !hasUnpublishedChanges}
            onClick={() => publish.mutate()}
          >
            {publish.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {publish.isPending ? 'Publishing…' : 'Publish'}
          </Button>
        </div>
      </div>

      <TeamTabs />

      <div className="mb-6 mt-6 flex flex-wrap items-center justify-between gap-4">
        <SegmentedControl
          options={AUDIENCES}
          value={audience}
          onChange={(id) => setAudience(id)}
          className="w-64"
        />
        <div className="flex items-center gap-4">
          <Badge variant={isLive ? 'moss' : 'neutral'} dot>
            {isLive ? 'Live' : flow?.publishedVersion ? 'Paused' : 'Draft'}
          </Badge>
          {!!flow?.publishedVersion && (
            <div className="flex items-center gap-2">
              <Label htmlFor="flow-enabled" className="text-xs text-ink-400">
                Show to new {audience === 'employee' ? 'employees' : 'clients'}
              </Label>
              <Switch
                id="flow-enabled"
                checked={!!flow?.isEnabled}
                onCheckedChange={(v) => setEnabled.mutate(v)}
              />
            </div>
          )}
        </div>
      </div>

      {hasUnpublishedChanges && !!flow?.publishedVersion && (
        <p className="mb-4 rounded-sm border border-ochre-200 bg-ochre-100/50 px-4 py-2.5 text-sm text-ochre-700">
          You have changes that are not published yet. People still see version{' '}
          {flow.publishedVersion} until you publish.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        <Card className="flex max-h-[640px] flex-col overflow-hidden hover:translate-y-0 hover:shadow-xs">
          <StepList
            steps={steps}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onReorder={commit}
            onAdd={addStep}
            onDelete={deleteStep}
          />
        </Card>

        <div className="space-y-6">
          {selected ? (
            <>
              <Card className="p-6 hover:translate-y-0 hover:shadow-xs">
                <StepEditor
                  step={selected}
                  audience={audience === 'employee' ? 'employee' : 'client'}
                  enabledModules={enabledModules}
                  onChange={patchSelected}
                />
              </Card>
              <StepPreview
                step={selected}
                stepNumber={steps.findIndex((s) => s.id === selected.id) + 1}
                stepCount={steps.length}
              />
            </>
          ) : (
            <Card className="p-12 text-center hover:translate-y-0 hover:shadow-xs">
              <p className="mb-1 font-display text-lg text-ink-900">Nothing written yet</p>
              <p className="text-sm text-ink-400">
                Add a step to start building the onboarding for your{' '}
                {audience === 'employee' ? 'team' : 'clients'}.
              </p>
            </Card>
          )}

          <ReaderProgressPanel audience={audience} />
        </div>
      </div>
    </div>
  );
}

/** Quiet by design — it should be legible when you look for it and invisible when you do not. */
function SaveIndicator({
  saving,
  dirty,
  reduce,
}: {
  saving: boolean;
  dirty: boolean;
  reduce: boolean;
}) {
  const label = saving ? 'Saving…' : dirty ? 'Unsaved' : 'Saved';
  return (
    <motion.span
      key={label}
      className="flex items-center gap-1.5 text-xs text-ink-400"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={motionTransition(reduce, springs.snappy)}
    >
      {saving ? (
        <Loader2 size={12} className="animate-spin" />
      ) : dirty ? (
        <span className="h-1.5 w-1.5 rounded-full bg-ochre-500" />
      ) : (
        <Check size={12} className="text-moss-600" />
      )}
      {label}
    </motion.span>
  );
}
