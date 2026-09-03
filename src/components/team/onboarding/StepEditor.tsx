import { useQuery } from '@tanstack/react-query';
import { Paperclip, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { AppDocument } from '@/lib/types';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { DocumentEditor } from '@/components/documents/DocumentEditor';
import { AnchorSelect } from './AnchorSelect';
import type { StudioStep } from '@/lib/onboarding/types';
import type { TourAudience } from '@/lib/onboarding/anchors';
import type { CompanyModule } from '@/lib/types';

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

export function StepEditor({
  step,
  audience,
  enabledModules,
  onChange,
}: {
  step: StudioStep;
  audience: TourAudience;
  enabledModules: CompanyModule[] | undefined;
  onChange: (patch: Partial<StudioStep>) => void;
}) {
  // Only images and video are offered: the step renders the attachment inline, and there is
  // nowhere sensible to put a PDF inside a 340px coach mark.
  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.get<AppDocument[]>('/documents').then((r) => r.data),
  });
  const attachable = documents.filter(
    (d) => d.status === 'ready' && (d.fileType === 'image' || d.fileType === 'video'),
  );

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="step-title">Title</Label>
        <Input
          id="step-title"
          value={step.title}
          placeholder="Where your work lives"
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Body</Label>
        {/* The same editor as Documents pages, so what an owner writes here behaves exactly
            like writing anywhere else in Portico. It emits JSON, not HTML — which is also what
            makes it safe to render into someone else's session. */}
        <div className="rounded-sm border border-ink-300">
          <DocumentEditor
            key={step.id}
            content={step.body ?? EMPTY_DOC}
            onChange={(body) => onChange({ body })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Point at</Label>
        <AnchorSelect
          value={step.anchorId}
          audience={audience}
          enabledModules={enabledModules}
          onChange={(anchorId) => onChange({ anchorId })}
        />
        <p className="text-xs text-ink-400">
          The step lights up this part of the app and explains it in place. Leave it empty and the
          step shows as a centred card instead.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="step-media">Attachment</Label>
        <div className="flex items-center gap-2">
          <Select
            id="step-media"
            value={step.mediaDocumentId ?? ''}
            onChange={(e) => onChange({ mediaDocumentId: e.target.value || null })}
            className="flex-1"
          >
            <option value="">No attachment</option>
            {attachable.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title}
              </option>
            ))}
          </Select>
          {step.mediaDocumentId && (
            <button
              type="button"
              onClick={() => onChange({ mediaDocumentId: null })}
              className="rounded-sm p-2 text-ink-400 transition-colors duration-hover ease-brand hover:bg-ink-100 hover:text-ink-700 focus-ring"
              aria-label="Remove attachment"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-ink-400">
          <Paperclip size={11} />
          Images and video from your Documents. Upload there first, then pick it here.
        </p>
      </div>

      <div className="flex items-start justify-between gap-4 border-t border-ink-200 pt-4">
        <div>
          <Label htmlFor="step-task">Completable task</Label>
          <p className="mt-1 text-xs text-ink-400">
            Adds this step to their setup checklist so they can tick it off later.
          </p>
        </div>
        <Switch
          id="step-task"
          checked={!!step.isTask}
          onCheckedChange={(isTask) => onChange({ isTask })}
        />
      </div>

      {step.isTask && (
        <div className="space-y-2">
          <Label htmlFor="step-task-label">Checklist wording</Label>
          <Input
            id="step-task-label"
            value={step.taskLabel ?? ''}
            placeholder={step.title || 'Read the brand guide'}
            onChange={(e) => onChange({ taskLabel: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
