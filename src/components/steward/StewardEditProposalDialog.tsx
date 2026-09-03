import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import type { StewardProposal, StewardProposedStep } from '@/lib/types';

/** A raw JSON editor for the proposed step's arguments, not a generated per-field form — the
 *  tool's JSON Schema isn't exposed to the frontend today, and a studio owner reviewing an
 *  autonomous agent's proposal is exactly the kind of user who benefits from seeing the literal
 *  arguments that will execute, not a friendlier form hiding them. Deliberately simple: one
 *  textarea per step, validated as JSON before submit. */
export function StewardEditProposalDialog({
  proposal,
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  proposal: StewardProposal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (editedSteps: StewardProposedStep[]) => void;
  submitting: boolean;
}) {
  const [drafts, setDrafts] = useState<string[]>(() => proposal.proposedSteps.map((s) => JSON.stringify(s.args, null, 2)));
  const [parseErrors, setParseErrors] = useState<(string | null)[]>(() => proposal.proposedSteps.map(() => null));

  const handleSubmit = () => {
    const parsed: StewardProposedStep[] = [];
    const errors: (string | null)[] = [];
    let hasError = false;

    drafts.forEach((draft, i) => {
      try {
        const args = JSON.parse(draft);
        parsed.push({ tool: proposal.proposedSteps[i].tool, args });
        errors.push(null);
      } catch {
        errors.push('Invalid JSON');
        hasError = true;
      }
    });

    setParseErrors(errors);
    if (!hasError) onSubmit(parsed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit before approving</DialogTitle>
          <DialogDescription>
            Adjust the exact arguments Steward will pass to <span className="font-mono">{proposal.proposedSteps[0]?.tool}</span> — this
            runs precisely what you save here, nothing is re-inferred.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {proposal.proposedSteps.map((step, i) => (
            <div key={i}>
              <p className="mb-1 font-mono text-xs text-ink-500">{step.tool}</p>
              <textarea
                value={drafts[i]}
                onChange={(e) => setDrafts((d) => d.map((v, idx) => (idx === i ? e.target.value : v)))}
                rows={8}
                spellCheck={false}
                className="w-full rounded-sm border border-ink-300 bg-ink-950 p-2 font-mono text-xs text-bone-100 focus-ring"
              />
              {parseErrors[i] && <p className="mt-1 text-xs text-terracotta-600">{parseErrors[i]}</p>}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Approving…' : 'Save & approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
