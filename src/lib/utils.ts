import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with clsx, respecting Tailwind's specificity rules
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * For `register(name, { setValueAs: numberOrUndefined })` on optional numeric inputs.
 * An untouched/cleared `<input type="number">` submits `''`, and `Number('')` is `0` — so
 * without this, "not filled in" would silently become a real 0 instead of `undefined`. Used
 * anywhere a missing value must stay absent (e.g. Capacity & Risk Radar's planning inputs,
 * where 0 and "not set" are different facts).
 */
export function numberOrUndefined(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}
