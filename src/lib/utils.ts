import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with clsx, respecting Tailwind's specificity rules
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
