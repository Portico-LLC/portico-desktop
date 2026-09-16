/** Bridges the friendly Schedule picker in NodeConfigPanel to the raw 5-field cron
 *  expression `Workflow.trigger` actually stores (minute hour day-of-month month
 *  day-of-week — see portico-backend's cron-util.ts, which parses with `cron-parser`). */

export type ScheduleFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface StructuredSchedule {
  frequency: ScheduleFrequency;
  minute: number; // 0-59
  hour: number; // 0-23 — unused for 'hourly'
  daysOfWeek: number[]; // 0 (Sun) - 6 (Sat) — used for 'weekly'; never empty
  dayOfMonth: number; // 1-31 — used for 'monthly'
}

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const DEFAULT_SCHEDULE: StructuredSchedule = {
  frequency: 'daily',
  minute: 0,
  hour: 9,
  daysOfWeek: [1],
  dayOfMonth: 1,
};

function parseInRange(raw: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= min && n <= max ? n : null;
}

/** Parses a 5-field cron expression into structured fields IF it matches one of the
 *  friendly patterns the picker UI supports (a single fixed minute/hour, `*` for the
 *  fields that vary, and a plain day-of-week list for weekly) — returns null for anything
 *  else (step values like `*\/15`, ranges, multiple hours, a month restriction, …) so the
 *  caller falls back to the raw-expression editor rather than silently mangling something
 *  it can't faithfully represent. */
export function parseCronToSchedule(expression: string): StructuredSchedule | null {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [minuteRaw, hourRaw, domRaw, monthRaw, dowRaw] = parts;
  if (monthRaw !== '*') return null;

  const minute = parseInRange(minuteRaw, 0, 59);
  if (minute === null) return null;

  if (hourRaw === '*') {
    if (domRaw !== '*' || dowRaw !== '*') return null;
    return { ...DEFAULT_SCHEDULE, frequency: 'hourly', minute };
  }

  const hour = parseInRange(hourRaw, 0, 23);
  if (hour === null) return null;

  if (domRaw === '*' && dowRaw === '*') {
    return { ...DEFAULT_SCHEDULE, frequency: 'daily', minute, hour };
  }
  if (domRaw === '*' && dowRaw !== '*') {
    const days = dowRaw.split(',').map((d) => parseInRange(d, 0, 6));
    if (days.some((d) => d === null) || days.length === 0) return null;
    return { ...DEFAULT_SCHEDULE, frequency: 'weekly', minute, hour, daysOfWeek: days as number[] };
  }
  if (domRaw !== '*' && dowRaw === '*') {
    const dayOfMonth = parseInRange(domRaw, 1, 31);
    if (dayOfMonth === null) return null;
    return { ...DEFAULT_SCHEDULE, frequency: 'monthly', minute, hour, dayOfMonth };
  }
  return null;
}

/** Inverse of `parseCronToSchedule` — always produces one of the friendly patterns above. */
export function scheduleToCron(s: StructuredSchedule): string {
  switch (s.frequency) {
    case 'hourly':
      return `${s.minute} * * * *`;
    case 'weekly': {
      const days = [...new Set(s.daysOfWeek)].sort((a, b) => a - b).join(',');
      return `${s.minute} ${s.hour} * * ${days || '*'}`;
    }
    case 'monthly':
      return `${s.minute} ${s.hour} ${s.dayOfMonth} * *`;
    case 'daily':
    default:
      return `${s.minute} ${s.hour} * * *`;
  }
}
