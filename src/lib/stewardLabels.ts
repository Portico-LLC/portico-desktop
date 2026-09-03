/** Shared between the Steward inbox (`pages/Steward.tsx`) and its Settings card
 *  (`components/settings/StewardSettingsCard.tsx`) so trigger labels never drift apart. */
export const STEWARD_TRIGGER_LABELS: Record<string, string> = {
  'project.riskThresholdCrossed': 'Risk threshold crossed',
  'employee.overCapacity': 'Team member over capacity',
  'invoice.overdue': 'Invoice overdue',
  'client.wentSilent': 'Client went quiet',
  daily_brief: 'Daily brief',
};

/** The event-driven triggers a studio can individually mute in Settings — `daily_brief` is
 *  excluded since it has its own dedicated enabled/hour controls, not a `triggersEnabled` entry. */
export const STEWARD_EVENT_TRIGGERS = [
  'project.riskThresholdCrossed',
  'employee.overCapacity',
  'invoice.overdue',
  'client.wentSilent',
] as const;
