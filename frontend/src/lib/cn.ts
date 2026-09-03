import { clsx, type ClassValue } from 'clsx';

/** Merge conditional class names. Kept deliberately small — no tailwind-merge:
 *  the component layer owns its class conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
