import { api } from '@/lib/api';
import type { AuthRole } from '@/store/auth';
import type {
  FlowReaderProgress,
  OnboardingBootstrap,
  OnboardingFlowDto,
  StudioStep,
  UpdateProgressPayload,
} from './types';

/** Shared so the provider, the checklist and the Settings card all read one cache entry
 *  rather than three copies of the same bootstrap. */
export const ONBOARDING_QUERY_KEY = ['onboarding', 'me'] as const;

/** The client portal is a separately-authenticated surface with its own guard, so it gets its
 *  own mirrored routes — the same split `client-documents` already uses. */
export function onboardingBase(role: AuthRole | null): string {
  return role === 'client' ? '/client/onboarding' : '/onboarding';
}

export function fetchBootstrap(role: AuthRole | null): Promise<OnboardingBootstrap> {
  return api.get<OnboardingBootstrap>(`${onboardingBase(role)}/me`).then((r) => r.data);
}

/**
 * Fire-and-forget by design. The tour advances on the client immediately and never waits for
 * this to land: a dropped write costs at most one repeated step on resume, which is a far
 * better failure than a walkthrough that stutters on a slow connection.
 */
export function postProgress(role: AuthRole | null, payload: UpdateProgressPayload): Promise<void> {
  return api.post(`${onboardingBase(role)}/progress`, payload).then(() => undefined);
}

export interface StepMedia {
  url: string;
  fileType?: string;
  mimeType?: string;
  title: string;
}

/** Resolved per step rather than up front: presigned URLs live 900s, which is shorter than a
 *  tour someone can pause and come back to. */
export function fetchStepMedia(role: AuthRole | null, stepId: string): Promise<StepMedia> {
  return api.get<StepMedia>(`${onboardingBase(role)}/media/${stepId}`).then((r) => r.data);
}

export function dismissChecklist(dismissed: boolean): Promise<void> {
  return api.post(`/onboarding/checklist/${dismissed ? 'dismiss' : 'restore'}`).then(() => undefined);
}

// --- Owner authoring -------------------------------------------------------

export type FlowAudience = 'employee' | 'client';

export function fetchFlow(audience: FlowAudience): Promise<OnboardingFlowDto> {
  return api.get<OnboardingFlowDto>(`/onboarding/flows/${audience}`).then((r) => r.data);
}

export function saveFlowDraft(
  audience: FlowAudience,
  patch: { name?: string; draftSteps?: StudioStep[]; isEnabled?: boolean },
): Promise<OnboardingFlowDto> {
  return api.patch<OnboardingFlowDto>(`/onboarding/flows/${audience}`, patch).then((r) => r.data);
}

export function publishFlow(audience: FlowAudience): Promise<OnboardingFlowDto> {
  return api.post<OnboardingFlowDto>(`/onboarding/flows/${audience}/publish`).then((r) => r.data);
}

export function fetchFlowReaders(audience: FlowAudience): Promise<FlowReaderProgress[]> {
  return api.get<FlowReaderProgress[]>(`/onboarding/flows/${audience}/progress`).then((r) => r.data);
}

export function resetFlowReader(audience: FlowAudience, subjectId: string): Promise<void> {
  return api.post(`/onboarding/flows/${audience}/reset/${subjectId}`).then(() => undefined);
}
