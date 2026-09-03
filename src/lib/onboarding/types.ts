import type { CompanyModule } from '@/lib/types';
import type { TourAnchorId } from './anchors';

export type OnboardingSubjectType = 'owner' | 'employee' | 'client';
export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';
export type OnboardingScope = 'builtIn' | 'studio';

/** What to do when a step's anchor cannot be found in the DOM. A built-in step is
 *  pointing-first and is meaningless as a centred card, so it skips; an owner-authored step is
 *  content-first, so it falls back to a card rather than losing their words. */
export type AnchorMissingBehaviour = 'skip' | 'modal';

/** A step in the built-in walkthrough. These live in the frontend rather than the database:
 *  the copy belongs next to the components it describes, and changing a sentence should not
 *  need a backend deploy. */
export interface BuiltInStep {
  id: string;
  /** Small uppercase label above the title — which part of the app this belongs to. */
  eyebrow: string;
  title: string;
  body: string;
  anchorId?: TourAnchorId;
  onAnchorMissing?: AnchorMissingBehaviour;
}

/** A step authored by a studio owner. Mirrors `OnboardingStep` on the backend. */
export interface StudioStep {
  id: string;
  title: string;
  /** TipTap JSON, rendered read-only. Never an HTML string. */
  body: unknown;
  anchorId?: string | null;
  onAnchorMissing?: AnchorMissingBehaviour;
  mediaDocumentId?: string | null;
  isTask?: boolean;
  taskLabel?: string | null;
  requiresModule?: CompanyModule | null;
  ctaLabel?: string | null;
  ctaRoute?: string | null;
}

export interface ChecklistItem {
  id: string;
  label: string;
  route: string;
  done: boolean;
}

export interface ChecklistResult {
  applicable: boolean;
  dismissed: boolean;
  items: ChecklistItem[];
  completed: number;
  total: number;
}

/** The response from `GET /onboarding/me` (and its client-portal mirror). */
export interface OnboardingBootstrap {
  subject: { type: OnboardingSubjectType; id: string };
  enabledModules: CompanyModule[];
  next: OnboardingScope | null;
  builtIn: {
    version: number;
    status: OnboardingStatus;
    resumeStepId: string | null;
  };
  studio: {
    flowId: string;
    version: number;
    name: string;
    status: OnboardingStatus;
    resumeStepId: string | null;
    completedTaskIds: string[];
    steps: StudioStep[];
  } | null;
  checklist: ChecklistResult;
}

export interface UpdateProgressPayload {
  scope: OnboardingScope;
  status?: OnboardingStatus;
  stepId?: string | null;
  completedTaskId?: string;
  flowVersion?: number;
}

export interface OnboardingFlowDto {
  id: string;
  ownerId: string;
  audience: 'employee' | 'client';
  name: string;
  draftSteps: StudioStep[];
  publishedSteps: StudioStep[];
  publishedVersion: number;
  isEnabled: boolean;
  publishedAt?: string | null;
  draftUpdatedAt?: string | null;
}

export interface FlowReaderProgress {
  subjectId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  status: OnboardingStatus;
  stepId: string | null;
  completedTaskIds: string[];
  completedAt: string | null;
}
