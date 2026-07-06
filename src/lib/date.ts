// Local-calendar date helpers. Ryft keys days by the device's local date (YYYY-MM-DD),
// never UTC, so "today" always means the user's today.

const WEEKDAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WEEKDAYS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const MONTHS_SHORT = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** YYYY-MM-DD for a given Date, in local time. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Today's local date as YYYY-MM-DD. */
export function todayISO(): string {
  return toISODate(new Date());
}

/** Parse a YYYY-MM-DD string into a local Date at midnight. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Shift an ISO date by a number of days (can be negative). */
export function addDays(iso: string, days: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function isToday(iso: string): boolean {
  return iso === todayISO();
}

export function yesterdayISO(): string {
  return addDays(todayISO(), -1);
}

/** 0=Sun .. 6=Sat for an ISO date. */
export function weekdayIndex(iso: string): number {
  return fromISODate(iso).getDay();
}

export function weekdayShort(iso: string): string {
  return WEEKDAYS_SHORT[weekdayIndex(iso)];
}

export function weekdayLong(iso: string): string {
  return WEEKDAYS_LONG[weekdayIndex(iso)];
}

/** "06 / 22 / 2026" — matches the journal-d1.html header style. */
export function formatSlashDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${m} / ${d} / ${y}`;
}

/** "JUN 22" compact label for timeline cards. */
export function formatCompact(iso: string): string {
  const d = fromISODate(iso);
  return `${MONTHS_SHORT[d.getMonth()]} ${pad2(d.getDate())}`;
}

/** Whole days between two ISO dates (a - b). */
export function daysBetween(aISO: string, bISO: string): number {
  const a = fromISODate(aISO).getTime();
  const b = fromISODate(bISO).getTime();
  return Math.round((a - b) / 86_400_000);
}

/** Human "3 days ago" / "today" / "yesterday". */
export function relativeLabel(iso: string): string {
  const diff = daysBetween(todayISO(), iso);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  if (diff >= 7 && diff < 30) return `${Math.floor(diff / 7)}w ago`;
  if (diff >= 30) return `${Math.floor(diff / 30)}mo ago`;
  return `in ${Math.abs(diff)}d`;
}

export const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const WEEKDAY_FULL = WEEKDAYS_LONG;
