import { z } from 'zod';
import { parseISO } from 'date-fns';
import type { BadgeProps } from '@/components/ui/Badge';
import type { Task, TaskStatus, TaskPriority } from '@/lib/types';

/**
 * Shared task vocabulary.
 *
 * The create/edit schema and the status labels are needed by three surfaces now
 * — the Tasks page, the Kanban board, and the desktop panel's Tasks tab. They
 * used to live as locals inside the first two; a third copy would have been the
 * one that drifts.
 */

export const taskSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['todo', 'in-progress', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
  // A planning input for Capacity & Risk Radar — explicit and user-entered, never inferred.
  // The empty-string-to-undefined normalization happens at `register(..., { setValueAs })`
  // (not here via z.preprocess, which would make zodResolver's inferred input type `unknown`
  // and break useForm<TaskForm>'s generic) — so an untouched field means "not estimated,"
  // never 0.
  estimatedHours: z.number().min(0).max(1000).optional(),
});

export type TaskForm = z.infer<typeof taskSchema>;

/** Mirrors `@MinLength(2)` on the backend's CreateTaskDto, so quick-add can
 *  disable submit rather than let the request 400. */
export const TASK_TITLE_MIN_LENGTH = 2;

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'review', 'done'];

export const STATUS_META: Record<TaskStatus, { label: string; badge: BadgeProps['variant'] }> = {
  todo: { label: 'To Do', badge: 'neutral' },
  'in-progress': { label: 'In Progress', badge: 'steel' },
  review: { label: 'Review', badge: 'ochre' },
  done: { label: 'Done', badge: 'moss' },
};

export const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

/**
 * Undated tasks sort last rather than first — an empty due date means "no
 * deadline", which shouldn't outrank something actually due today.
 */
export function sortByDueDate(a: Task, b: Task): number {
  if (!a.dueDate && !b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime();
}
