import type { CompanyModule } from '@/lib/types';
import { getAnchor } from './anchors';
import type { BuiltInStep, OnboardingSubjectType } from './types';

/**
 * The built-in walkthrough, one script per role.
 *
 * Voice follows `DESIGN.md` §1: calm, precise, confident. No hype, no exclamation marks, no
 * "revolutionary". Each step says what a thing is and why it exists, not how to click it —
 * the spotlight already handles where.
 *
 * Order follows the shape of a working day rather than the sidebar's order: find things, then
 * the work, then the people, then the money, then the power tools.
 */

const OWNER_STEPS: BuiltInStep[] = [
  {
    id: 'owner.search',
    eyebrow: 'Anywhere',
    title: 'Start here, always',
    body: 'Command-K opens the palette from any screen. Projects, clients, invoices, people — search once instead of navigating three times. It is the fastest way to move around Portico.',
    anchorId: 'sidebar.search',
  },
  {
    id: 'owner.projects',
    eyebrow: 'Work',
    title: 'Every engagement is a project',
    body: 'A project holds its status, budget, due date and the whole task list. Save one as a template once the shape repeats, and the next kickoff takes a minute.',
    anchorId: 'sidebar.projects',
  },
  {
    id: 'owner.tasks',
    eyebrow: 'Work',
    title: 'The day-to-day lives on the board',
    body: 'Tasks carry priority, due dates, notes and dependencies. Drag them across the board, or let Brain and Automations move them for you.',
    anchorId: 'sidebar.tasks',
  },
  {
    id: 'owner.clients',
    eyebrow: 'Clients',
    title: 'Your side and their side',
    body: 'Each client record opens a portal of their own: their projects, their tasks, their invoices, and a thread straight to you. They never see another client.',
    anchorId: 'sidebar.clients',
  },
  {
    id: 'owner.invoices',
    eyebrow: 'Clients',
    title: 'Invoicing, kept in-house',
    body: 'Line items, tax, discounts and a draft-to-paid lifecycle, exported as a PDF. Record-keeping for your studio — Portico does not process payments.',
    anchorId: 'sidebar.invoices',
  },
  {
    id: 'owner.brain',
    eyebrow: 'Leverage',
    title: 'Ask, and it acts',
    body: 'Brain reads and writes the same data you do. Ask it to reschedule a task, draft a message to a client, or explain where a project stands. Anything destructive asks you first.',
    anchorId: 'sidebar.brain',
  },
  {
    id: 'owner.automations',
    eyebrow: 'Leverage',
    title: 'The work that runs itself',
    body: 'Build a workflow on a canvas: a trigger, some conditions, and the same actions Brain uses. Overdue tasks that chase themselves, weekly digests, kickoff checklists.',
    anchorId: 'sidebar.automations',
  },
  {
    id: 'owner.team',
    eyebrow: 'Team',
    title: 'Bring in your people',
    body: 'Invite employees and scope them to the projects they are on. This is also where you write the onboarding your new hires and clients will see.',
    anchorId: 'sidebar.team',
  },
  {
    id: 'owner.checklist',
    eyebrow: 'Dashboard',
    title: 'A short list to get going',
    body: 'Six things worth doing in your first week. It ticks itself off as you do them, and disappears when you are done.',
    anchorId: 'dashboard.checklist',
    // The card only renders while the checklist is unfinished and undismissed, so a returning
    // owner replaying the tour would otherwise stall here.
    onAnchorMissing: 'skip',
  },
];

const EMPLOYEE_STEPS: BuiltInStep[] = [
  {
    id: 'employee.search',
    eyebrow: 'Anywhere',
    title: 'Start here, always',
    body: 'Command-K opens the palette from any screen. Search projects, tasks and people instead of hunting through the sidebar.',
    anchorId: 'sidebar.search',
  },
  {
    id: 'employee.tasks',
    eyebrow: 'Work',
    title: 'Your board',
    body: 'Everything assigned to you, with priority, due dates and notes. Drag a card to move it along; leave a note when something needs saying.',
    anchorId: 'sidebar.tasks',
  },
  {
    id: 'employee.projects',
    eyebrow: 'Work',
    title: 'The projects you are on',
    body: 'You see the engagements you have been assigned to, with their status and timeline. Ask your studio owner if something you expect is missing.',
    anchorId: 'sidebar.projects',
  },
  {
    id: 'employee.teamChat',
    eyebrow: 'Collaborate',
    title: 'Where the studio talks',
    body: 'Channels for the team, direct messages for one-to-one, and mentions that reach the right person. Notifications land in your Inbox.',
    anchorId: 'sidebar.teamChat',
  },
  {
    id: 'employee.vault',
    eyebrow: 'Collaborate',
    title: 'Credentials, encrypted',
    body: 'Shared logins and API keys, encrypted on your machine before they leave it. The server stores only ciphertext — it cannot read what you put here.',
    anchorId: 'sidebar.vault',
  },
];

const CLIENT_STEPS: BuiltInStep[] = [
  {
    id: 'client.overview',
    eyebrow: 'Portal',
    title: 'Your studio, at a glance',
    body: 'Everything your studio is doing for you, in one place: what is in progress, what needs you, and what is outstanding.',
    anchorId: 'portal.overview',
  },
  {
    id: 'client.projects',
    eyebrow: 'Portal',
    title: 'The work itself',
    body: 'Each project shows its status, timeline and the tasks inside it. Open one to see where things actually stand.',
    anchorId: 'portal.projects',
  },
  {
    id: 'client.tasks',
    eyebrow: 'Portal',
    title: 'Where you are needed',
    body: 'Tasks waiting on you, with somewhere to reply. Mark one done or leave a note, and your studio sees it immediately.',
    anchorId: 'portal.tasks',
  },
  {
    id: 'client.invoices',
    eyebrow: 'Portal',
    title: 'Invoices, in full',
    body: 'Every invoice with its line items and status, downloadable as a PDF. No surprises and nothing to chase by email.',
    anchorId: 'portal.invoices',
  },
  {
    id: 'client.messages',
    eyebrow: 'Portal',
    title: 'One thread, not a mailbox',
    body: 'Talk to your studio here and keep the whole conversation attached to the work it belongs to.',
    anchorId: 'portal.messages',
  },
];

const BY_ROLE: Record<OnboardingSubjectType, BuiltInStep[]> = {
  owner: OWNER_STEPS,
  employee: EMPLOYEE_STEPS,
  client: CLIENT_STEPS,
};

/**
 * The script for a role, minus anything this studio has switched off.
 *
 * Filtered here rather than server-side because the copy and the anchors both live in the
 * frontend, and `enabledModules` arrives on the bootstrap payload — which is also how employee
 * and client sessions get hold of it at all, since their JWTs have never carried it.
 */
export function builtInStepsFor(
  role: OnboardingSubjectType,
  enabledModules: CompanyModule[] | undefined,
): BuiltInStep[] {
  const steps = BY_ROLE[role] ?? [];
  if (!enabledModules?.length) return steps;
  return steps.filter((step) => {
    const module = step.anchorId ? getAnchor(step.anchorId)?.module : undefined;
    return !module || enabledModules.includes(module);
  });
}
