import type { RadarUnavailableReason } from '@/lib/types';

/** Single source of reason-code -> human copy, so wording never drifts across the dashboard,
 *  the mini-panel tab, and any tooltip — all three read from this one map. */
export const REASON_COPY: Record<RadarUnavailableReason, string> = {
  zero_capacity: 'Weekly capacity is set to 0 (on leave)',
  no_estimates: 'None of this week’s tasks have an hour estimate yet',
  no_dated_open_tasks: 'No open tasks have a due date',
  no_due_date: 'Project has no due date set',
  no_tasks: 'Project has no tasks yet',
  no_dependencies_defined: 'This project has never used task dependencies — blockers can’t be seen here',
  no_team_assigned: 'No one is assigned to this project',
  no_member_utilization: 'Assigned team members don’t have a computable utilization yet',
  insufficient_data: 'Not enough signals available to compute a score',
  no_budget_set: 'No budget has been set for this project',
  incomplete_estimates: 'Some completed tasks are missing an hour estimate',
  missing_rates: 'Some assignees don’t have an hourly rate set',
  project_closed: 'Project is completed or cancelled — not scored',
};

export function reasonLabel(reason: RadarUnavailableReason | undefined): string {
  return reason ? REASON_COPY[reason] : 'Not enough data to compute';
}
