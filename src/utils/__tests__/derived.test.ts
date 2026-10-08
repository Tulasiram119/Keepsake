import type { Friend, GratitudeEntry, Interaction } from '@/types/models';
import {
  buildDashboard,
  collectGroups,
  contactStatus,
  daysUntilDue,
  formatLastContact,
  generalGratitude,
  gratitudeForFriend,
  interactionsForFriend,
  lastInteractionFor,
  latestGratitudeFor,
  statusMessage,
} from '@/utils/derived';

const now = new Date(2026, 9, 7, 10, 0);
const daysAgo = (n: number) => new Date(2026, 9, 7 - n, 12, 0).toISOString();

const friend = (id: string, extra: Partial<Friend> = {}): Friend => ({
  id,
  name: `Friend ${id}`,
  createdAt: daysAgo(100),
  updatedAt: daysAgo(100),
  ...extra,
});
const interaction = (id: string, friendId: string, ago: number, type: Interaction['type'] = 'called'): Interaction => ({
  id,
  friendId,
  type,
  date: daysAgo(ago),
  createdAt: daysAgo(ago),
  updatedAt: daysAgo(ago),
});
const thanks = (id: string, friendIds: string[], ago: number): GratitudeEntry => ({
  id,
  text: `thanks ${id}`,
  date: daysAgo(ago),
  friendIds,
  createdAt: daysAgo(ago),
  updatedAt: daysAgo(ago),
});

describe('interaction lookups', () => {
  const list = [interaction('i1', 'a', 10), interaction('i2', 'a', 2), interaction('i3', 'b', 1)];
  it('finds the latest interaction per friend', () => {
    expect(lastInteractionFor('a', list)?.id).toBe('i2');
    expect(lastInteractionFor('zzz', list)).toBeUndefined();
  });
  it('lists a friend timeline newest first', () => {
    expect(interactionsForFriend('a', list).map((i) => i.id)).toEqual(['i2', 'i1']);
  });
});

describe('repeat interval status', () => {
  it('is none without an interval', () => {
    expect(contactStatus(friend('a'), undefined, now)).toBe('none');
    expect(daysUntilDue(friend('a'), undefined, now)).toBeUndefined();
  });
  it('counts from the last interaction', () => {
    const f = friend('a', { repeatEveryDays: 14 });
    expect(daysUntilDue(f, interaction('i', 'a', 4), now)).toBe(10);
    expect(contactStatus(f, interaction('i', 'a', 4), now)).toBe('ok');
    expect(contactStatus(f, interaction('i', 'a', 12), now)).toBe('soon');
    expect(contactStatus(f, interaction('i', 'a', 14), now)).toBe('soon'); // due today
    expect(contactStatus(f, interaction('i', 'a', 15), now)).toBe('overdue');
  });
  it('counts from createdAt when never contacted', () => {
    const f = friend('a', { repeatEveryDays: 7, createdAt: daysAgo(3) });
    expect(daysUntilDue(f, undefined, now)).toBe(4);
  });
  it('returns snoozed when snoozedUntil is in the future', () => {
    const f = friend('a', { repeatEveryDays: 7, snoozedUntil: daysAgo(-3) });
    expect(contactStatus(f, interaction('i', 'a', 15), now)).toBe('snoozed');
  });
  it('resumes normal overdue status when snoozedUntil is in the past', () => {
    const f = friend('a', { repeatEveryDays: 7, snoozedUntil: daysAgo(2) });
    expect(contactStatus(f, interaction('i', 'a', 15), now)).toBe('overdue');
  });
});

describe('gratitude selectors', () => {
  const list = [thanks('g1', ['a'], 5), thanks('g2', ['a', 'b'], 1), thanks('g3', [], 2)];
  it('filters by friend and finds latest', () => {
    expect(gratitudeForFriend('a', list).map((g) => g.id)).toEqual(['g2', 'g1']);
    expect(latestGratitudeFor('b', list)?.id).toBe('g2');
    expect(latestGratitudeFor('c', list)).toBeUndefined();
  });
  it('lists general gratitude', () => {
    expect(generalGratitude(list).map((g) => g.id)).toEqual(['g3']);
  });
});

describe('buildDashboard', () => {
  it('puts overdue first (most overdue first), then longest since contact; hides archived', () => {
    const friends = [
      friend('recent'),
      friend('over2', { repeatEveryDays: 7 }),
      friend('old'),
      friend('over9', { repeatEveryDays: 7 }),
      friend('gone', { archived: true }),
    ];
    const interactions = [
      interaction('1', 'recent', 1),
      interaction('2', 'over2', 9),
      interaction('3', 'old', 40),
      interaction('4', 'over9', 16),
    ];
    const gratitude = [thanks('g', ['old'], 3)];
    const result = buildDashboard(friends, interactions, gratitude, now);
    expect(result.map((e) => e.friend.id)).toEqual(['over9', 'over2', 'old', 'recent']);
    expect(result[2]).toMatchObject({ daysSinceContact: 40, status: 'none' });
    expect(result[2].latestGratitude?.id).toBe('g');
    expect(result[0]).toMatchObject({ status: 'overdue', daysUntilDue: -9 });
  });
  it('ranks never-contacted friends by createdAt', () => {
    const friends = [friend('new', { createdAt: daysAgo(1) }), friend('contacted')];
    const result = buildDashboard(friends, [interaction('1', 'contacted', 5)], [], now);
    expect(result.map((e) => e.friend.id)).toEqual(['contacted', 'new']);
  });
});

describe('copy helpers', () => {
  it('formats last contact', () => {
    expect(formatLastContact(interaction('i', 'a', 12), now)).toBe('Called 12 days ago');
    expect(formatLastContact(interaction('i', 'a', 0, 'met'), now)).toBe('Met today');
    expect(formatLastContact(undefined, now)).toBe('No contact logged yet');
  });
  it('writes gentle status messages', () => {
    const f = friend('a', { name: 'Ravi Kumar' });
    expect(statusMessage({ friend: f, status: 'overdue', daysUntilDue: -3 })).toBe(
      "It's been a while since you spoke with Ravi",
    );
    expect(statusMessage({ friend: f, status: 'soon', daysUntilDue: 0 })).toBe(
      'A good day to reach out to Ravi',
    );
    expect(statusMessage({ friend: f, status: 'soon', daysUntilDue: 2 })).toBe(
      'Time to catch up with Ravi soon',
    );
    expect(statusMessage({ friend: f, status: 'ok', daysUntilDue: 9 })).toBeUndefined();
  });
  it('collects unique sorted groups', () => {
    expect(
      collectGroups([friend('a', { group: 'work' }), friend('b', { group: 'Family' }), friend('c', { group: 'work' }), friend('d')]),
    ).toEqual(['Family', 'work']);
  });
});
