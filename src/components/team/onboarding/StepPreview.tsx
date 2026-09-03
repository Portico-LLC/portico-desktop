import { getAnchor } from '@/lib/onboarding/anchors';
import { renderRichText } from '@/lib/onboarding/renderRichText';
import { COACH_MARK_SHELL, CoachMarkContent } from '@/components/onboarding/CoachMark';
import type { StudioStep } from '@/lib/onboarding/types';
import { cn } from '@/lib/utils';

/**
 * What the reader will actually see.
 *
 * Renders the real `CoachMarkContent` rather than a mock-up, so the preview cannot drift from
 * the live component as either changes. Only the positioning is different — the live card is
 * `position: fixed` against a spotlight, and here it sits in a static box.
 *
 * Behind it is a deliberately crude wireframe of the app: enough to show *where* the step will
 * appear relative to the sidebar and the content area, without pretending to be a screenshot.
 */
export function StepPreview({
  step,
  stepNumber,
  stepCount,
}: {
  step: StudioStep;
  stepNumber: number;
  stepCount: number;
}) {
  const anchor = step.anchorId ? getAnchor(step.anchorId) : undefined;
  const noop = () => {};

  return (
    <div className="overflow-hidden rounded-lg border border-ink-200 bg-bone-200/60">
      <div className="flex items-center justify-between border-b border-ink-200 bg-bone-50 px-4 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">
          Preview
        </p>
        <p className="text-xs text-ink-400">
          {anchor ? `Points at ${anchor.label}` : 'Centred card'}
        </p>
      </div>

      <div className="relative flex gap-3 p-4">
        {/* The always-dark rail, drawn with the same chrome tokens the real sidebar uses so the
            preview reads correctly in both themes. */}
        <div className="hidden w-16 flex-shrink-0 rounded-sm bg-[var(--chrome-bg)] p-2 sm:block">
          <div className="mb-2 h-5 w-full rounded-[3px] bg-[var(--chrome-border)]" />
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className={cn(
                'mb-1.5 h-3 w-full rounded-[3px]',
                anchor?.group === 'Navigation' && i === 1
                  ? 'bg-[var(--chrome-active-bg)] ring-1 ring-[var(--chrome-accent)]'
                  : 'bg-[var(--chrome-border)]',
              )}
            />
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-3 space-y-1.5">
            <div className="h-2.5 w-1/3 rounded-[3px] bg-ink-200" />
            <div className="h-2 w-1/2 rounded-[3px] bg-ink-200/70" />
          </div>

          <div className={cn(COACH_MARK_SHELL, 'max-w-[340px]')}>
            <CoachMarkContent
              eyebrow={step.isTask ? 'To do' : 'Onboarding'}
              title={step.title || 'Untitled step'}
              body={
                renderRichText(step.body, `preview-${step.id}`) ?? (
                  <span className="text-ink-400">Write the body and it appears here.</span>
                )
              }
              stepNumber={stepNumber}
              stepCount={stepCount}
              isFirst={stepNumber === 1}
              nextLabel={stepNumber === stepCount ? 'Finish' : undefined}
              onNext={noop}
              onBack={noop}
              onSkip={noop}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
