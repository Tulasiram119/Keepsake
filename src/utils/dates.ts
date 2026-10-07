import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameYear,
  parseISO,
} from 'date-fns';

import type { ISODate } from '@/types/models';

/** Whole calendar days from `iso` until `now` (positive when `iso` is in the past). */
export function daysSince(iso: ISODate, now: Date): number {
  return differenceInCalendarDays(now, parseISO(iso));
}

export function relativeDays(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days === -1) return 'tomorrow';
  if (days > 1) return `${days} days ago`;
  return `in ${-days} days`;
}

export function formatDay(iso: ISODate, now: Date): string {
  const d = parseISO(iso);
  return isSameYear(d, now) ? format(d, 'EEE, d MMM') : format(d, 'd MMM yyyy');
}

export function formatDayTime(iso: ISODate, now: Date): string {
  return `${formatDay(iso, now)} · ${format(parseISO(iso), 'h:mm a')}`;
}

/** `now` moved by `offset` calendar days; optionally pinned to `hour`:00. */
export function atDayOffset(now: Date, offset: number, hour?: number): ISODate {
  const d = addDays(now, offset);
  if (hour !== undefined) d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export function shiftDays(iso: ISODate, days: number): ISODate {
  return addDays(parseISO(iso), days).toISOString();
}

export function setHour(iso: ISODate, hour: number): ISODate {
  const d = parseISO(iso);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const BIRTHDAY_RE = /^(?:(\d{4})-)?(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isValidBirthday(v: string): boolean {
  return BIRTHDAY_RE.test(v.trim());
}

function parseBirthday(v: string): { year?: number; month: number; day: number } {
  const m = BIRTHDAY_RE.exec(v.trim());
  if (!m) throw new Error(`Invalid birthday: ${v}`);
  return { year: m[1] ? Number(m[1]) : undefined, month: Number(m[2]), day: Number(m[3]) };
}

export function formatBirthday(v: string): string {
  const { year, month, day } = parseBirthday(v);
  const d = new Date(2000, month - 1, day);
  return year ? `${format(d, 'd MMM')} ${year}` : format(d, 'd MMM');
}

export function daysUntilBirthday(v: string, now: Date): number {
  const { month, day } = parseBirthday(v);
  let next = new Date(now.getFullYear(), month - 1, day);
  if (differenceInCalendarDays(next, now) < 0) {
    next = new Date(now.getFullYear() + 1, month - 1, day);
  }
  return differenceInCalendarDays(next, now);
}
