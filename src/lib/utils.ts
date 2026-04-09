import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Pakistan Standard Time = UTC+5
export function nowPKT(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5 * 3600000);
}

export function toPKT(date: string | Date): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utc + 5 * 3600000);
}

export function formatPKT(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const pktDate = toPKT(date);
  return pktDate.toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    ...options,
  });
}

export function pktISOString(): string {
  return nowPKT().toISOString();
}
