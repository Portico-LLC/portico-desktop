import type { ComponentType } from 'react';
import { AutomationScene } from '@/components/landing/scenes/AutomationScene';
import { ChatScene } from '@/components/landing/scenes/ChatScene';
import { CipherScene } from '@/components/landing/scenes/CipherScene';
import { GraphScene } from '@/components/landing/scenes/GraphScene';
import { InvoiceScene } from '@/components/landing/scenes/InvoiceScene';
import { KanbanScene } from '@/components/landing/scenes/KanbanScene';
import { ProjectScene } from '@/components/landing/scenes/ProjectScene';
import type { OnboardingSubjectType } from './types';

export interface Chapter {
  id: string;
  eyebrow: string;
  title: string;
  caption: string;
  /** One of the landing page's animated product miniatures. Omitted on the opening chapter,
   *  which is carried by the arch motif alone. */
  Scene?: ComponentType<{ play: boolean }>;
  /** How long this chapter holds before auto-advancing, in ms. */
  dwell: number;
}

/**
 * The cinematic act, one reel per role.
 *
 * Every scene here already exists — they are the looping product miniatures the landing page
 * uses, all sharing a `{ play: boolean }` signature and a 3D `SceneStage` with parallax planes.
 * Reusing them means the intro shows the actual product rather than an illustration of it, and
 * costs no new animation code.
 *
 * Dwell times are deliberately uneven: the opening beat is short because it is a title card,
 * and the chapters carrying a moving scene get long enough for the loop to make its point.
 */
const OWNER: Chapter[] = [
  {
    id: 'welcome',
    eyebrow: 'Welcome',
    title: 'The front door between your studio and your clients',
    caption: 'Projects, files, invoices and conversations — one threshold, crossed in both directions.',
    dwell: 5200,
  },
  {
    id: 'work',
    eyebrow: 'The work',
    title: 'Every engagement, from kickoff to done',
    caption: 'Projects hold the shape. Tasks carry the day. The board shows you where it all actually is.',
    Scene: KanbanScene,
    dwell: 7000,
  },
  {
    id: 'clients',
    eyebrow: 'Your clients',
    title: 'A portal of their own',
    caption: 'They see their projects, their invoices and a thread straight to you — and nothing that is not theirs.',
    Scene: InvoiceScene,
    dwell: 7000,
  },
  {
    id: 'brain',
    eyebrow: 'Brain',
    title: 'Ask, and it acts',
    caption: 'A control plane for the whole studio, in plain language. It reads and writes what you do — and asks before anything destructive.',
    Scene: GraphScene,
    dwell: 7000,
  },
  {
    id: 'automations',
    eyebrow: 'Automations',
    title: 'The work that runs itself',
    caption: 'A trigger, a few conditions, and the same actions Brain uses. Build it once on the canvas and stop remembering it.',
    Scene: AutomationScene,
    dwell: 7000,
  },
];

const EMPLOYEE: Chapter[] = [
  {
    id: 'welcome',
    eyebrow: 'Welcome',
    title: 'Everything your studio is working on, in one place',
    caption: 'You will see the projects you are on, the work assigned to you, and the people doing it with you.',
    dwell: 5200,
  },
  {
    id: 'tasks',
    eyebrow: 'Your work',
    title: 'The board is the day',
    caption: 'Priorities, due dates and dependencies. Drag a card along as the work moves.',
    Scene: KanbanScene,
    dwell: 7000,
  },
  {
    id: 'messages',
    eyebrow: 'Together',
    title: 'Where the studio talks',
    caption: 'Channels, direct messages and mentions that reach the right person without an email thread.',
    Scene: ChatScene,
    dwell: 6400,
  },
  {
    id: 'vault',
    eyebrow: 'Vault',
    title: 'Credentials nobody else can read',
    caption: 'Encrypted on your machine before they leave it. The server stores ciphertext and nothing else.',
    Scene: CipherScene,
    dwell: 6400,
  },
];

const CLIENT: Chapter[] = [
  {
    id: 'welcome',
    eyebrow: 'Welcome',
    title: 'Your studio, without the email thread',
    caption: 'Everything being made for you, and everywhere you are needed, in one place.',
    dwell: 5200,
  },
  {
    id: 'projects',
    eyebrow: 'The work',
    title: 'See exactly where things stand',
    caption: 'Each project with its status, its timeline, and the tasks inside it. No status meeting required.',
    Scene: ProjectScene,
    dwell: 6800,
  },
  {
    id: 'invoices',
    eyebrow: 'Invoices',
    title: 'Every figure, in full',
    caption: 'Line items, totals and status, downloadable as a PDF whenever you need one.',
    Scene: InvoiceScene,
    dwell: 6400,
  },
  {
    id: 'messages',
    eyebrow: 'Talk to us',
    title: 'One thread, attached to the work',
    caption: 'Ask a question where the answer belongs, instead of in a mailbox nobody can search.',
    Scene: ChatScene,
    dwell: 6400,
  },
];

const BY_ROLE: Record<OnboardingSubjectType, Chapter[]> = {
  owner: OWNER,
  employee: EMPLOYEE,
  client: CLIENT,
};

export function chaptersFor(role: OnboardingSubjectType): Chapter[] {
  return BY_ROLE[role] ?? OWNER;
}
