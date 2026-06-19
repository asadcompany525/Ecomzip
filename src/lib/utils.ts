// ============================================================
// Utility Functions — Poori app mein use hone wale helpers
// ============================================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind CSS classes combine karne ka helper
// Usage: cn('px-4', isActive && 'bg-orange-500', className)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Pakistan Standard Time (UTC+5) Utilities ──────────────────

// Abhi ka waqt PKT mein (Date object)
export function nowPKT(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5 * 3600000);
}

// Kisi bhi date/string ko PKT mein convert karo
export function toPKT(date: string | Date): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utc + 5 * 3600000);
}

// PKT date ko readable string mein format karo
// Example: formatPKT(someDate, { dateStyle: 'short' })
export function formatPKT(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const pktDate = toPKT(date);
  return pktDate.toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    ...options,
  });
}

// PKT mein abhi ka ISO string return karo
export function pktISOString(): string {
  return nowPKT().toISOString();
}
