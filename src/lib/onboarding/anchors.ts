import type { CompanyModule } from '@/lib/types';

/** The attribute every anchored element carries. There is no other `data-*` convention in the
 *  app, so this namespace is ours alone. */
export const TOUR_ATTR = 'data-tour-id';

export type TourAudience = 'owner' | 'employee' | 'client';

export interface TourAnchor {
  /** What the studio owner sees in the builder's "Point at" dropdown. Written as a location,
   *  not an instruction, so the list reads as a map of the app. */
  label: string;
  group: 'Navigation' | 'Top bar' | 'Dashboard' | 'Work' | 'Clients' | 'Knowledge' | 'Portal';
  /** Where the tour navigates before it starts looking. Carrying the route here is what lets a
   *  step author pick an element without also having to know its URL. */
  route: string;
  audiences: readonly TourAudience[];
  /** Hidden from the builder and stripped server-side when the studio has the module off. */
  module?: CompanyModule;
  /** Preferred side for the coach mark; the placement solver may flip it to fit the viewport. */
  placement?: 'top' | 'right' | 'bottom' | 'left';
  /** The element legitimately may not exist — an empty-state-only CTA, or a control that only
   *  renders in the desktop shell. Suppresses the dev-time audit warning. */
  optional?: boolean;
}

/**
 * Every element the tour is allowed to point at.
 *
 * This registry is the frontend's alone. The server keeps a deliberately partial mirror
 * (`ANCHOR_MODULE_MAP` in `onboarding.constants.ts`) holding only the anchor-to-module mapping
 * it needs to strip unreachable steps — everything here that concerns the DOM stays here,
 * because only the frontend knows about the DOM.
 *
 * Ids are `area.element`. Keep them stable: an owner-authored step stores the id, so renaming
 * one orphans their step (which degrades to a plain card rather than breaking, but still loses
 * the pointing).
 */
export const TOUR_ANCHORS = {
  // --- Studio navigation ---------------------------------------------------
  'sidebar.dashboard': { label: 'Dashboard', group: 'Navigation', route: '/', audiences: ['owner', 'employee'], placement: 'right' },
  'sidebar.pulse': { label: 'Pulse — activity feed', group: 'Navigation', route: '/pulse', audiences: ['owner', 'employee'], placement: 'right' },
  'sidebar.radar': { label: 'Radar — capacity & risk', group: 'Navigation', route: '/radar', audiences: ['owner', 'employee'], module: 'radar', placement: 'right' },
  'sidebar.inbox': { label: 'Inbox', group: 'Navigation', route: '/inbox', audiences: ['owner', 'employee'], placement: 'right' },
  'sidebar.calendar': { label: 'Calendar', group: 'Navigation', route: '/calendar', audiences: ['owner'], module: 'calendar', placement: 'right' },
  'sidebar.projects': { label: 'Projects', group: 'Navigation', route: '/projects', audiences: ['owner', 'employee'], module: 'projects', placement: 'right' },
  'sidebar.tasks': { label: 'Tasks', group: 'Navigation', route: '/tasks', audiences: ['owner', 'employee'], module: 'tasks', placement: 'right' },
  'sidebar.templates': { label: 'Project templates', group: 'Navigation', route: '/project-templates', audiences: ['owner'], module: 'projectTemplates', placement: 'right' },
  'sidebar.automations': { label: 'Automations', group: 'Navigation', route: '/automations', audiences: ['owner'], module: 'automations', placement: 'right' },
  'sidebar.clients': { label: 'Clients', group: 'Navigation', route: '/clients', audiences: ['owner'], placement: 'right' },
  'sidebar.invoices': { label: 'Invoices', group: 'Navigation', route: '/invoices', audiences: ['owner'], module: 'invoices', placement: 'right' },
  'sidebar.teamChat': { label: 'Messages', group: 'Navigation', route: '/team-chat', audiences: ['owner', 'employee'], module: 'teamChat', placement: 'right' },
  'sidebar.arcade': { label: 'Arcade', group: 'Navigation', route: '/arcade', audiences: ['owner', 'employee'], module: 'games', placement: 'right' },
  'sidebar.brain': { label: 'Brain — the AI agent', group: 'Navigation', route: '/brain', audiences: ['owner'], module: 'brain', placement: 'right' },
  'sidebar.steward': { label: 'Steward', group: 'Navigation', route: '/steward', audiences: ['owner'], module: 'steward', placement: 'right' },
  'sidebar.vault': { label: 'Vault', group: 'Navigation', route: '/vault', audiences: ['owner', 'employee'], module: 'vault', placement: 'right' },
  'sidebar.documents': { label: 'Documents', group: 'Navigation', route: '/documents', audiences: ['owner', 'employee'], module: 'documents', placement: 'right' },
  'sidebar.team': { label: 'Team', group: 'Navigation', route: '/team', audiences: ['owner'], placement: 'right' },
  'sidebar.settings': { label: 'Settings', group: 'Navigation', route: '/settings', audiences: ['owner', 'employee'], placement: 'right' },
  'sidebar.search': { label: 'Search — the command palette', group: 'Navigation', route: '/', audiences: ['owner', 'employee'], placement: 'right' },

  // --- Top bar -------------------------------------------------------------
  'topbar.panel': { label: 'Floating panel button', group: 'Top bar', route: '/', audiences: ['owner', 'employee'], placement: 'bottom', optional: true },
  'topbar.notifications': { label: 'Notification bell', group: 'Top bar', route: '/', audiences: ['owner', 'employee'], placement: 'bottom' },
  'topbar.theme': { label: 'Light / dark toggle', group: 'Top bar', route: '/', audiences: ['owner', 'employee', 'client'], placement: 'bottom' },
  'topbar.profile': { label: 'Profile menu', group: 'Top bar', route: '/', audiences: ['owner', 'employee', 'client'], placement: 'bottom' },

  // --- Studio pages --------------------------------------------------------
  'dashboard.checklist': { label: 'Setup checklist card', group: 'Dashboard', route: '/', audiences: ['owner'], placement: 'left', optional: true },
  'projects.newProject': { label: 'New project button', group: 'Work', route: '/projects', audiences: ['owner'], module: 'projects', placement: 'bottom' },
  'tasks.board': { label: 'The task board', group: 'Work', route: '/tasks', audiences: ['owner', 'employee'], module: 'tasks', placement: 'top' },
  'tasks.newTask': { label: 'New task button', group: 'Work', route: '/tasks', audiences: ['owner', 'employee'], module: 'tasks', placement: 'bottom' },
  'automations.newWorkflow': { label: 'New automation button', group: 'Work', route: '/automations', audiences: ['owner'], module: 'automations', placement: 'bottom' },
  'clients.newClient': { label: 'Add client button', group: 'Clients', route: '/clients', audiences: ['owner'], placement: 'bottom' },
  'invoices.newInvoice': { label: 'New invoice button', group: 'Clients', route: '/invoices', audiences: ['owner'], module: 'invoices', placement: 'bottom' },
  'team.inviteEmployee': { label: 'Invite employee button', group: 'Clients', route: '/team', audiences: ['owner'], placement: 'bottom' },
  'team.onboardingTab': { label: 'Team — Onboarding tab', group: 'Clients', route: '/team', audiences: ['owner'], placement: 'bottom' },
  'documents.upload': { label: 'Document upload area', group: 'Knowledge', route: '/documents', audiences: ['owner', 'employee'], module: 'documents', placement: 'top' },
  'brain.composer': { label: 'Brain message box', group: 'Knowledge', route: '/brain', audiences: ['owner'], module: 'brain', placement: 'top' },
  'vault.newItem': { label: 'New vault item button', group: 'Knowledge', route: '/vault', audiences: ['owner', 'employee'], module: 'vault', placement: 'bottom' },
  'settings.replayTour': { label: 'Settings — replay walkthrough', group: 'Knowledge', route: '/settings', audiences: ['owner', 'employee'], placement: 'top' },

  // --- Client portal -------------------------------------------------------
  'portal.overview': { label: 'Portal overview', group: 'Portal', route: '/portal', audiences: ['client'], placement: 'right' },
  'portal.brain': { label: 'Portal — Brain', group: 'Portal', route: '/portal/brain', audiences: ['client'], module: 'brain', placement: 'right' },
  'portal.projects': { label: 'Portal — Projects', group: 'Portal', route: '/portal/projects', audiences: ['client'], module: 'projects', placement: 'right' },
  'portal.tasks': { label: 'Portal — Tasks', group: 'Portal', route: '/portal/tasks', audiences: ['client'], module: 'tasks', placement: 'right' },
  'portal.invoices': { label: 'Portal — Invoices', group: 'Portal', route: '/portal/invoices', audiences: ['client'], module: 'invoices', placement: 'right' },
  'portal.messages': { label: 'Portal — Messages', group: 'Portal', route: '/portal/team-chat', audiences: ['client'], module: 'teamChat', placement: 'right' },
  'portal.vault': { label: 'Portal — Vault', group: 'Portal', route: '/portal/vault', audiences: ['client'], module: 'vault', placement: 'right' },
  'portal.documents': { label: 'Portal — Documents', group: 'Portal', route: '/portal/documents', audiences: ['client'], module: 'documents', placement: 'right' },
} as const satisfies Record<string, TourAnchor>;

export type TourAnchorId = keyof typeof TOUR_ANCHORS;

export function getAnchor(id: string): TourAnchor | undefined {
  return (TOUR_ANCHORS as Record<string, TourAnchor>)[id];
}

/** Maps a sidebar `href` onto its anchor id, so `Sidebar`/`ClientSidebar` can tag every nav
 *  item from their existing loops instead of hand-annotating twenty links. */
const HREF_TO_ANCHOR: Record<string, TourAnchorId> = {
  '/': 'sidebar.dashboard',
  '/pulse': 'sidebar.pulse',
  '/radar': 'sidebar.radar',
  '/inbox': 'sidebar.inbox',
  '/calendar': 'sidebar.calendar',
  '/projects': 'sidebar.projects',
  '/tasks': 'sidebar.tasks',
  '/project-templates': 'sidebar.templates',
  '/automations': 'sidebar.automations',
  '/clients': 'sidebar.clients',
  '/invoices': 'sidebar.invoices',
  '/team-chat': 'sidebar.teamChat',
  '/arcade': 'sidebar.arcade',
  '/brain': 'sidebar.brain',
  '/steward': 'sidebar.steward',
  '/vault': 'sidebar.vault',
  '/documents': 'sidebar.documents',
  '/team': 'sidebar.team',
  '/settings': 'sidebar.settings',
  '/portal': 'portal.overview',
  '/portal/brain': 'portal.brain',
  '/portal/projects': 'portal.projects',
  '/portal/tasks': 'portal.tasks',
  '/portal/invoices': 'portal.invoices',
  '/portal/team-chat': 'portal.messages',
  '/portal/vault': 'portal.vault',
  '/portal/documents': 'portal.documents',
};

export function anchorForHref(href: string): TourAnchorId | undefined {
  return HREF_TO_ANCHOR[href];
}

/** Options for the builder's "Point at" dropdown: only anchors this audience can actually
 *  reach, and only modules this studio has switched on. */
export function anchorsForAudience(
  audience: TourAudience,
  enabledModules: CompanyModule[] | undefined,
): Array<{ id: TourAnchorId; anchor: TourAnchor }> {
  return (Object.entries(TOUR_ANCHORS) as Array<[TourAnchorId, TourAnchor]>)
    .filter(([, a]) => a.audiences.includes(audience))
    .filter(([, a]) => !a.module || !enabledModules?.length || enabledModules.includes(a.module))
    .map(([id, anchor]) => ({ id, anchor }));
}
