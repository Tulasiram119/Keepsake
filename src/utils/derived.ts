import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';

import type { Friend, GratitudeEntry, ID, ISODate, Interaction } from '@/types/models';
import { daysSince, relativeDays } from '@/utils/dates';
import { INTERACTION_META } from '@/utils/interaction-meta';

export type ContactStatus = 'none' | 'ok' | 'soon' | 'overdue' | 'snoozed';
export const DUE_SOON_DAYS = 2;

export function isSnoozed(friend: Friend, now: Date): boolean {
  if (!friend.snoozedUntil) return false;
  try {
    return parseISO(friend.snoozedUntil) > now;
  } catch {
    return false;
  }
}

/** ISO strings from toISOString() sort lexicographically. */
export function byDateDesc<T extends { date: ISODate }>(a: T, b: T): number {
  if (a.date < b.date) return 1;
  if (a.date > b.date) return -1;
  return 0;
}

export function indexLastInteractions(interactions: Interaction[]): Map<ID, Interaction> {
  const map = new Map<ID, Interaction>();
  for (const i of interactions) {
    const current = map.get(i.friendId);
    if (!current || i.date > current.date) map.set(i.friendId, i);
  }
  return map;
}

export function lastInteractionFor(friendId: ID, interactions: Interaction[]): Interaction | undefined {
  let latest: Interaction | undefined;
  for (const i of interactions) {
    if (i.friendId === friendId && (!latest || i.date > latest.date)) latest = i;
  }
  return latest;
}

export function interactionsForFriend(friendId: ID, interactions: Interaction[]): Interaction[] {
  return interactions.filter((i) => i.friendId === friendId).sort(byDateDesc);
}

export function dueDateFor(friend: Friend, last?: Interaction, now?: Date): Date | undefined {
  if (now && isSnoozed(friend, now)) {
    return parseISO(friend.snoozedUntil!);
  }
  if (!friend.repeatEveryDays) return undefined;
  return addDays(parseISO(last?.date ?? friend.createdAt), friend.repeatEveryDays);
}

export function daysUntilDue(friend: Friend, last: Interaction | undefined, now: Date): number | undefined {
  const due = dueDateFor(friend, last, now);
  return due ? differenceInCalendarDays(due, now) : undefined;
}

function statusFromDaysUntilDue(days: number | undefined): ContactStatus {
  if (days === undefined) return 'none';
  if (days < 0) return 'overdue';
  if (days <= DUE_SOON_DAYS) return 'soon';
  return 'ok';
}

export function contactStatus(friend: Friend, last: Interaction | undefined, now: Date): ContactStatus {
  if (isSnoozed(friend, now)) return 'snoozed';
  return statusFromDaysUntilDue(daysUntilDue(friend, last, now));
}

export function gratitudeForFriend(friendId: ID, gratitude: GratitudeEntry[]): GratitudeEntry[] {
  return gratitude.filter((g) => g.friendIds.includes(friendId)).sort(byDateDesc);
}

export function latestGratitudeFor(friendId: ID, gratitude: GratitudeEntry[]): GratitudeEntry | undefined {
  return gratitudeForFriend(friendId, gratitude)[0];
}

export function generalGratitude(gratitude: GratitudeEntry[]): GratitudeEntry[] {
  return gratitude.filter((g) => g.friendIds.length === 0).sort(byDateDesc);
}

export interface DashboardEntry {
  friend: Friend;
  last?: Interaction;
  status: ContactStatus;
  daysSinceContact?: number;
  daysUntilDue?: number;
  latestGratitude?: GratitudeEntry;
}

function compareDashboard(a: DashboardEntry, b: DashboardEntry): number {
  const aOver = a.status === 'overdue';
  const bOver = b.status === 'overdue';
  if (aOver !== bOver) return aOver ? -1 : 1;
  if (aOver && bOver) return (a.daysUntilDue ?? 0) - (b.daysUntilDue ?? 0);
  const aRef = a.last?.date ?? a.friend.createdAt;
  const bRef = b.last?.date ?? b.friend.createdAt;
  if (aRef !== bRef) return aRef < bRef ? -1 : 1;
  return a.friend.name.localeCompare(b.friend.name);
}

export function buildDashboard(
  friends: Friend[],
  interactions: Interaction[],
  gratitude: GratitudeEntry[],
  now: Date,
): DashboardEntry[] {
  const lastBy = indexLastInteractions(interactions);
  const gratitudeBy = new Map<ID, GratitudeEntry>();
  for (const g of gratitude) {
    for (const id of g.friendIds) {
      const current = gratitudeBy.get(id);
      if (!current || g.date > current.date) gratitudeBy.set(id, g);
    }
  }
  return friends
    .filter((f) => !f.archived)
    .map((friend): DashboardEntry => {
      const last = lastBy.get(friend.id);
      const due = daysUntilDue(friend, last, now);
      return {
        friend,
        last,
        status: contactStatus(friend, last, now),
        daysSinceContact: last ? daysSince(last.date, now) : undefined,
        daysUntilDue: due,
        latestGratitude: gratitudeBy.get(friend.id),
      };
    })
    .sort(compareDashboard);
}

export function formatLastContact(last: Interaction | undefined, now: Date): string {
  if (!last) return 'No contact logged yet';
  return `${INTERACTION_META[last.type].past} ${relativeDays(daysSince(last.date, now))}`;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function statusMessage(
  entry: Pick<DashboardEntry, 'friend' | 'status' | 'daysUntilDue'>,
): string | undefined {
  const name = firstName(entry.friend.name);
  if (entry.status === 'snoozed') return `Snoozed for now`;
  if (entry.status === 'overdue') return `It's been a while since you spoke with ${name}`;
  if (entry.status === 'soon') {
    return entry.daysUntilDue === 0
      ? `A good day to reach out to ${name}`
      : `Time to catch up with ${name} soon`;
  }
  return undefined;
}

export function collectGroups(friends: Friend[]): string[] {
  const set = new Set<string>();
  for (const f of friends) if (f.group) set.add(f.group);
  return [...set].sort((a, b) => a.localeCompare(b));
}
