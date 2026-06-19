// ============================================================
// PKT (Pakistan Standard Time) — date-fns-tz based utilities
// Flash sale aur admin time inputs ke liye use hota hai
// ============================================================

import { toZonedTime, fromZonedTime, format as tzFormat } from 'date-fns-tz';

export const PKT = 'Asia/Karachi'; // UTC+5

// Abhi ka waqt PKT mein
export const nowPKT = (): Date => toZonedTime(new Date(), PKT);

// UTC ISO string ko admin form ke liye PKT datetime-local format mein badlo
// Example: "2026-06-19T01:30:00Z" → "2026-06-19T06:30"
export const utcToPKTInput = (utcIso: string): string => {
  if (!utcIso) return '';
  const zoned = toZonedTime(new Date(utcIso), PKT);
  return tzFormat(zoned, "yyyy-MM-dd'T'HH:mm", { timeZone: PKT });
};

// Admin form ki PKT datetime-local value ko UTC ISO mein badlo
// Example: "2026-06-19T06:30" → "2026-06-19T01:30:00.000Z"
export const pktInputToUtcIso = (localDatetime: string): string => {
  if (!localDatetime) return '';
  const utc = fromZonedTime(new Date(localDatetime), PKT);
  return utc.toISOString();
};

// App load pe timezone info console mein log karo (debug ke liye)
export const logTimezoneSync = () => {
  const localNow = new Date();
  const pktNow = toZonedTime(localNow, PKT);
  const pktStr = tzFormat(pktNow, 'yyyy-MM-dd HH:mm:ss', { timeZone: PKT });
  const offsetSign = localNow.getTimezoneOffset() >= 0 ? '-' : '+';
  const offsetHrs = Math.abs(localNow.getTimezoneOffset() / 60);
  console.log(
    `[TZ SYNC] UTC: ${localNow.toISOString()} | PKT (Asia/Karachi): ${pktStr} | Browser offset: UTC${offsetSign}${offsetHrs}`
  );
};
