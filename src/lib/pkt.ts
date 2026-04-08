import { toZonedTime, fromZonedTime, format as tzFormat } from 'date-fns-tz';

export const PKT = 'Asia/Karachi';

export const nowPKT = (): Date => toZonedTime(new Date(), PKT);

export const utcToPKTInput = (utcIso: string): string => {
  if (!utcIso) return '';
  const zoned = toZonedTime(new Date(utcIso), PKT);
  return tzFormat(zoned, "yyyy-MM-dd'T'HH:mm", { timeZone: PKT });
};

export const pktInputToUtcIso = (localDatetime: string): string => {
  if (!localDatetime) return '';
  const utc = fromZonedTime(new Date(localDatetime), PKT);
  return utc.toISOString();
};

export const logTimezoneSync = () => {
  const localNow = new Date();
  const pktNow = toZonedTime(localNow, PKT);
  const pktStr = tzFormat(pktNow, 'yyyy-MM-dd HH:mm:ss', { timeZone: PKT });
  console.log(
    `[TZ SYNC] UTC: ${localNow.toISOString()} | PKT (Asia/Karachi): ${pktStr} | ` +
    `Browser offset: UTC${localNow.getTimezoneOffset() >= 0 ? '-' : '+'}${Math.abs(localNow.getTimezoneOffset() / 60)}`
  );
};
