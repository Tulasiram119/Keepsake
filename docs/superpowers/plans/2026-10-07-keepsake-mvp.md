# Keepsake MVP (Phases 1–2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the offline-first Keepsake app foundation and MVP: friends, interaction log, gratitude journal, "How long has it been?" dashboard, and repeat-interval logic.

**Architecture:** Expo SDK 57 + Expo Router (routes in `src/app/`). A single Zustand store composed of domain slices, persisted to AsyncStorage through a one-file adapter. All "last contact / due / overdue" values are derived by pure, unit-tested functions that take an explicit `now`.

**Tech Stack:** Expo 57, React Native 0.86, React 19.2, TypeScript 6 (strict), Expo Router 57 (JS `Tabs` + `Stack`), Zustand 5, AsyncStorage, date-fns 4, expo-crypto, @expo/vector-icons (Ionicons), @expo-google-fonts (Fraunces + Nunito), jest-expo.

**Spec:** `docs/superpowers/specs/2026-10-07-keepsake-mvp-design.md` (product source: `plan.md`)

## Global Constraints

- Install Expo-ecosystem packages with `npx expo install <pkg>` (SDK-compatible versions), never plain `npm install`.
- TypeScript `strict: true`; no `any`.
- Import alias `@/*` → `./src/*`. Routes live only in `src/app/`; no non-route code there.
- Colors only from `src/theme/palettes.ts` (warm-light / warm-dark hex values from plan §8). No pure `#000`/`#FFF`.
- Body text ≥ 16 px; tap targets ≥ 44 px.
- Overdue uses amber/coral, never red. Copy is gentle: "It's been a while since you spoke with Ravi", never "OVERDUE".
- Derived values (last contact, due, status, latest gratitude) are computed, never stored.
- Persist key `keepsake-store`, `version: 1`, `hasHydrated` never persisted.
- Web target uses `"output": "single"` (client-only SPA; data is device-local).
- Destructive actions confirm via `src/utils/confirm.ts` (works on web and native).

---

## File Structure

```
src/
  app/
    _layout.tsx            # fonts, hydration gate, nav theme, root Stack
    (tabs)/_layout.tsx     # bottom tabs
    (tabs)/index.tsx       # Home dashboard
    (tabs)/friends.tsx     # Friends list
    (tabs)/gratitude.tsx   # Gratitude timeline
    (tabs)/settings.tsx    # Settings
    friend/[id].tsx        # Friend detail
    friend/edit.tsx        # Add/edit friend (param id?)
    log-interaction.tsx    # Modal (params friendId?, interactionId?)
    add-gratitude.tsx      # Modal (params friendId?, entryId?)
  components/              # UI building blocks (one component per file)
  store/
    index.ts               # useAppStore (persist config)
    types.ts               # AppState, SliceCreator, PersistedState
    defaults.ts            # DEFAULT_SETTINGS, EMPTY_DATA
    migrations.ts          # migratePersisted
    friends-slice.ts
    interactions-slice.ts
    gratitude-slice.ts
    settings-slice.ts
    hooks.ts               # useFriends, useFriend, ... appActions
    __tests__/store.test.ts
  storage/adapter.ts       # AsyncStorage → StateStorage
  theme/
    palettes.ts tokens.ts use-theme.ts use-color-scheme.ts use-color-scheme.web.ts
  types/models.ts
  utils/
    dates.ts derived.ts interaction-meta.ts id.ts confirm.ts
    __tests__/dates.test.ts __tests__/derived.test.ts
```

---

### Task 1: Project scaffold, tooling, and test harness

**Files:**
- Create (copied from a fresh `create-expo-app --template default` probe, without `.git`/`.claude`/`node_modules` re-download): `package.json`, `app.json`, `tsconfig.json`, `.gitignore`, `assets/`, `AGENTS.md`, `expo-env.d.ts` (if present)
- Delete: template `src/**`, `scripts/reset-project.js`
- Create: `jest.setup.ts`, `src/app/index.tsx` (temporary placeholder), `src/utils/__tests__/smoke.test.ts`
- Modify: spec doc (routes path → `src/app/`, web output `single`)

- [ ] **Step 1: Copy the probe project into the repo** (reuses installed `node_modules`)

```bash
rsync -a --exclude .git --exclude .claude <probe>/ ./
rm -rf src scripts
```

- [ ] **Step 2: Rename and configure** — `package.json` `name: "keepsake"`; `app.json`: `name: "Keepsake"`, `slug: "keepsake"`, `scheme: "keepsake"`, `web.output: "single"`, splash `backgroundColor: "#FBF6EE"`, android adaptive icon `backgroundColor: "#FBF6EE"`.

- [ ] **Step 3: Remove unused template deps, add project deps**

```bash
npm uninstall @expo/ui expo-device expo-glass-effect expo-symbols expo-web-browser
npx expo install zustand @react-native-async-storage/async-storage date-fns expo-crypto @expo/vector-icons @expo-google-fonts/fraunces @expo-google-fonts/nunito
npx expo install jest-expo jest @types/jest --dev
```

- [ ] **Step 4: Jest config** — in `package.json`:

```json
"scripts": { "test": "jest", "typecheck": "tsc --noEmit" },
"jest": {
  "preset": "jest-expo",
  "setupFiles": ["<rootDir>/jest.setup.ts"],
  "moduleNameMapper": { "^@/(.*)$": "<rootDir>/src/$1" },
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|zustand)"
  ]
}
```

`tsconfig.json` → add `"types": ["jest"]` under `compilerOptions`.

`jest.setup.ts`:
```ts
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-crypto', () => ({
  randomUUID: () => require('crypto').randomUUID(),
}));
```

- [ ] **Step 5: Smoke test + placeholder route**

`src/utils/__tests__/smoke.test.ts`:
```ts
describe('harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```
`src/app/index.tsx`: a `View` with `Text` "Keepsake".

- [ ] **Step 6: Verify** — `npx jest` → 1 passed; `npx tsc --noEmit` → no errors.

- [ ] **Step 7: Commit** — `chore: scaffold Expo SDK 57 project with jest harness`

---

### Task 2: Domain types and date helpers

**Files:**
- Create: `src/types/models.ts`, `src/utils/dates.ts`, `src/utils/interaction-meta.ts`
- Test: `src/utils/__tests__/dates.test.ts`

**Interfaces — Produces:**
- Types: `ID`, `ISODate`, `InteractionType`, `PlannedContact`, `Friend`, `Interaction`, `GratitudeEntry`, `ThemePreference`, `Settings`, `FriendInput`, `InteractionInput`, `GratitudeInput`
- `daysSince(iso: ISODate, now: Date): number`
- `relativeDays(days: number): string`
- `formatDay(iso: ISODate, now: Date): string`
- `formatDayTime(iso: ISODate, now: Date): string`
- `atDayOffset(now: Date, offset: number, hour?: number): ISODate`
- `shiftDays(iso: ISODate, days: number): ISODate`
- `setHour(iso: ISODate, hour: number): ISODate`
- `isValidBirthday(v: string): boolean`, `formatBirthday(v: string): string`, `daysUntilBirthday(v: string, now: Date): number`
- `INTERACTION_TYPES`, `INTERACTION_META: Record<InteractionType, { label: string; past: string; icon: IconName }>`

- [ ] **Step 1: Write `src/types/models.ts`**

```ts
export type ID = string;
export type ISODate = string;

export type InteractionType = 'met' | 'called' | 'texted' | 'video';

export interface PlannedContact {
  at: ISODate;
  type: InteractionType;
  notificationId?: string;
}

export interface Friend {
  id: ID;
  name: string;
  photoUri?: string;
  phone?: string;
  birthday?: string; // "MM-DD" or "YYYY-MM-DD"
  howWeMet?: string;
  notes?: string;
  group?: string;
  repeatEveryDays?: number;
  nextPlanned?: PlannedContact;
  createdAt: ISODate;
  updatedAt: ISODate;
  archived?: boolean;
}

export interface Interaction {
  id: ID;
  friendId: ID;
  type: InteractionType;
  date: ISODate;
  note?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface GratitudeEntry {
  id: ID;
  text: string;
  date: ISODate;
  friendIds: ID[]; // empty = general gratitude
  tag?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type ThemePreference = 'warm-light' | 'warm-dark' | 'system';

export interface Settings {
  dailyPromptEnabled: boolean;
  dailyPromptTime: string;
  birthdayRemindersEnabled: boolean;
  reminderTime: string;
  theme: ThemePreference;
}

export type FriendInput = Omit<Friend, 'id' | 'createdAt' | 'updatedAt'>;
export type InteractionInput = Pick<Interaction, 'friendId' | 'type' | 'date' | 'note'>;
export type GratitudeInput = Pick<GratitudeEntry, 'text' | 'date' | 'friendIds' | 'tag'>;
```

- [ ] **Step 2: Write the failing test `src/utils/__tests__/dates.test.ts`**

```ts
import {
  atDayOffset,
  daysSince,
  daysUntilBirthday,
  formatBirthday,
  formatDay,
  isValidBirthday,
  relativeDays,
  setHour,
  shiftDays,
} from '@/utils/dates';

const now = new Date(2026, 9, 7, 10, 0, 0); // 7 Oct 2026, 10:00 local

describe('daysSince', () => {
  it('counts calendar days, not 24h blocks', () => {
    expect(daysSince(new Date(2026, 9, 6, 23, 0).toISOString(), now)).toBe(1);
    expect(daysSince(new Date(2026, 9, 7, 1, 0).toISOString(), now)).toBe(0);
    expect(daysSince(new Date(2026, 8, 25, 12, 0).toISOString(), now)).toBe(12);
  });
});

describe('relativeDays', () => {
  it.each([
    [0, 'today'],
    [1, 'yesterday'],
    [12, '12 days ago'],
    [-1, 'tomorrow'],
    [-3, 'in 3 days'],
  ])('%i → %s', (days, text) => {
    expect(relativeDays(days)).toBe(text);
  });
});

describe('formatDay', () => {
  it('omits the year for the current year', () => {
    expect(formatDay(new Date(2026, 2, 3).toISOString(), now)).toBe('Tue, 3 Mar');
  });
  it('includes the year otherwise', () => {
    expect(formatDay(new Date(2025, 11, 25).toISOString(), now)).toBe('25 Dec 2025');
  });
});

describe('date arithmetic', () => {
  it('atDayOffset keeps time unless an hour is given', () => {
    const y = new Date(atDayOffset(now, -1));
    expect([y.getDate(), y.getHours()]).toEqual([6, 10]);
    const t = new Date(atDayOffset(now, 1, 18));
    expect([t.getDate(), t.getHours(), t.getMinutes()]).toEqual([8, 18, 0]);
  });
  it('shiftDays and setHour', () => {
    const base = now.toISOString();
    expect(new Date(shiftDays(base, 3)).getDate()).toBe(10);
    expect(new Date(setHour(base, 7)).getHours()).toBe(7);
  });
});

describe('birthdays', () => {
  it('validates MM-DD and YYYY-MM-DD', () => {
    expect(isValidBirthday('03-12')).toBe(true);
    expect(isValidBirthday('1994-03-12')).toBe(true);
    expect(isValidBirthday('13-01')).toBe(false);
    expect(isValidBirthday('3-12')).toBe(false);
    expect(isValidBirthday('')).toBe(false);
  });
  it('formats', () => {
    expect(formatBirthday('03-12')).toBe('12 Mar');
    expect(formatBirthday('1994-03-12')).toBe('12 Mar 1994');
  });
  it('counts days until the next birthday', () => {
    expect(daysUntilBirthday('10-07', now)).toBe(0);
    expect(daysUntilBirthday('10-19', now)).toBe(12);
    expect(daysUntilBirthday('1990-10-06', now)).toBe(364);
  });
});
```

- [ ] **Step 3: Run** `npx jest src/utils/__tests__/dates.test.ts` → FAIL (module not found).

- [ ] **Step 4: Implement `src/utils/dates.ts`**

```ts
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
```

- [ ] **Step 5: Write `src/utils/interaction-meta.ts`**

```ts
import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

import type { InteractionType } from '@/types/models';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export const INTERACTION_TYPES: readonly InteractionType[] = ['met', 'called', 'texted', 'video'];

export const INTERACTION_META: Record<
  InteractionType,
  { label: string; past: string; icon: IconName }
> = {
  met: { label: 'Met', past: 'Met', icon: 'cafe-outline' },
  called: { label: 'Call', past: 'Called', icon: 'call-outline' },
  texted: { label: 'Text', past: 'Texted', icon: 'chatbubble-ellipses-outline' },
  video: { label: 'Video', past: 'Video called', icon: 'videocam-outline' },
};
```

- [ ] **Step 6: Run** `npx jest src/utils` → PASS; `npx tsc --noEmit` → clean.

- [ ] **Step 7: Commit** — `feat: domain types and date helpers`

---

### Task 3: Derived selectors (dashboard logic)

**Files:**
- Create: `src/utils/derived.ts`
- Test: `src/utils/__tests__/derived.test.ts`

**Interfaces — Consumes:** Task 2 types, `daysSince`, `relativeDays`, `INTERACTION_META`.
**Produces:**
- `type ContactStatus = 'none' | 'ok' | 'soon' | 'overdue'`; `DUE_SOON_DAYS = 2`
- `byDateDesc<T extends { date: ISODate }>(a: T, b: T): number`
- `indexLastInteractions(interactions: Interaction[]): Map<ID, Interaction>`
- `lastInteractionFor(friendId: ID, interactions: Interaction[]): Interaction | undefined`
- `interactionsForFriend(friendId: ID, interactions: Interaction[]): Interaction[]` (newest first)
- `dueDateFor(friend: Friend, last?: Interaction): Date | undefined`
- `daysUntilDue(friend: Friend, last: Interaction | undefined, now: Date): number | undefined`
- `contactStatus(friend: Friend, last: Interaction | undefined, now: Date): ContactStatus`
- `gratitudeForFriend(friendId: ID, gratitude: GratitudeEntry[]): GratitudeEntry[]` (newest first)
- `latestGratitudeFor(friendId: ID, gratitude: GratitudeEntry[]): GratitudeEntry | undefined`
- `generalGratitude(gratitude: GratitudeEntry[]): GratitudeEntry[]` (newest first)
- `interface DashboardEntry { friend; last?; status; daysSinceContact?; daysUntilDue?; latestGratitude? }`
- `buildDashboard(friends, interactions, gratitude, now): DashboardEntry[]`
- `formatLastContact(last: Interaction | undefined, now: Date): string`
- `firstName(name: string): string`
- `statusMessage(entry: Pick<DashboardEntry, 'friend' | 'status' | 'daysUntilDue'>): string | undefined`
- `collectGroups(friends: Friend[]): string[]`

- [ ] **Step 1: Write the failing test `src/utils/__tests__/derived.test.ts`**

```ts
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
```

- [ ] **Step 2: Run** `npx jest src/utils/__tests__/derived.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement `src/utils/derived.ts`**

```ts
import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';

import type { Friend, GratitudeEntry, ID, ISODate, Interaction } from '@/types/models';
import { daysSince, relativeDays } from '@/utils/dates';
import { INTERACTION_META } from '@/utils/interaction-meta';

export type ContactStatus = 'none' | 'ok' | 'soon' | 'overdue';
export const DUE_SOON_DAYS = 2;

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

export function dueDateFor(friend: Friend, last?: Interaction): Date | undefined {
  if (!friend.repeatEveryDays) return undefined;
  return addDays(parseISO(last?.date ?? friend.createdAt), friend.repeatEveryDays);
}

export function daysUntilDue(friend: Friend, last: Interaction | undefined, now: Date): number | undefined {
  const due = dueDateFor(friend, last);
  return due ? differenceInCalendarDays(due, now) : undefined;
}

function statusFromDaysUntilDue(days: number | undefined): ContactStatus {
  if (days === undefined) return 'none';
  if (days < 0) return 'overdue';
  if (days <= DUE_SOON_DAYS) return 'soon';
  return 'ok';
}

export function contactStatus(friend: Friend, last: Interaction | undefined, now: Date): ContactStatus {
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
        status: statusFromDaysUntilDue(due),
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
```

- [ ] **Step 4: Run** `npx jest src/utils` → PASS.

- [ ] **Step 5: Commit** — `feat: derived dashboard and gratitude selectors`

---

### Task 4: Persisted store (slices, adapter, hooks)

**Files:**
- Create: `src/storage/adapter.ts`, `src/utils/id.ts`, `src/store/{types,defaults,migrations,friends-slice,interactions-slice,gratitude-slice,settings-slice,index,hooks}.ts`
- Test: `src/store/__tests__/store.test.ts`

**Interfaces — Produces:**
- `useAppStore` (Zustand hook with `.getState()`, `.setState()`, `.persist`)
- Actions: `addFriend(input: FriendInput): Friend`, `updateFriend(id, patch: Partial<FriendInput>)`, `setArchived(id, archived: boolean)`, `setPlannedContact(id, planned?: PlannedContact)`, `deleteFriend(id)`, `logInteraction(input: InteractionInput): Interaction`, `updateInteraction(id, patch: Partial<InteractionInput>)`, `deleteInteraction(id)`, `addGratitude(input: GratitudeInput): GratitudeEntry`, `updateGratitude(id, patch: Partial<GratitudeInput>)`, `deleteGratitude(id)`, `updateSettings(patch: Partial<Settings>)`
- Hooks: `useFriends()`, `useFriend(id?)`, `useInteractions()`, `useGratitude()`, `useSettings()`, `useHasHydrated()`, `appActions()`
- `DEFAULT_SETTINGS`, `EMPTY_DATA`, `STORE_KEY = 'keepsake-store'`, `STORE_VERSION = 1`

- [ ] **Step 1: Write the failing test `src/store/__tests__/store.test.ts`**

```ts
import { EMPTY_DATA } from '@/store/defaults';
import { useAppStore } from '@/store';

const actions = () => useAppStore.getState();

beforeEach(() => {
  useAppStore.setState({ ...EMPTY_DATA });
  jest.useFakeTimers({ now: new Date('2026-10-07T10:00:00.000Z') });
});
afterEach(() => jest.useRealTimers());

describe('friends', () => {
  it('adds a friend with id, timestamps and tidied fields', () => {
    const f = actions().addFriend({ name: '  Ravi  ', phone: ' ', group: 'college ' });
    expect(f.id).toMatch(/[0-9a-f-]{36}/);
    expect(f).toMatchObject({ name: 'Ravi', group: 'college', createdAt: '2026-10-07T10:00:00.000Z' });
    expect(f.phone).toBeUndefined();
    expect(actions().friends).toHaveLength(1);
  });

  it('updates and bumps updatedAt', () => {
    const f = actions().addFriend({ name: 'Ravi' });
    jest.setSystemTime(new Date('2026-10-08T10:00:00.000Z'));
    actions().updateFriend(f.id, { repeatEveryDays: 14 });
    expect(actions().friends[0]).toMatchObject({ repeatEveryDays: 14, updatedAt: '2026-10-08T10:00:00.000Z' });
  });

  it('archives and sets planned contact', () => {
    const f = actions().addFriend({ name: 'Ravi' });
    actions().setArchived(f.id, true);
    actions().setPlannedContact(f.id, { at: '2026-10-10T12:00:00.000Z', type: 'called' });
    expect(actions().friends[0]).toMatchObject({ archived: true, nextPlanned: { type: 'called' } });
    actions().setPlannedContact(f.id, undefined);
    expect(actions().friends[0].nextPlanned).toBeUndefined();
  });

  it('deleteFriend removes interactions and unlinks gratitude atomically', () => {
    const ravi = actions().addFriend({ name: 'Ravi' });
    const asha = actions().addFriend({ name: 'Asha' });
    actions().logInteraction({ friendId: ravi.id, type: 'met', date: '2026-10-01T10:00:00.000Z' });
    actions().logInteraction({ friendId: asha.id, type: 'called', date: '2026-10-02T10:00:00.000Z' });
    const solo = actions().addGratitude({ text: 'Helped me move', date: '2026-10-01T10:00:00.000Z', friendIds: [ravi.id] });
    const both = actions().addGratitude({ text: 'Road trip', date: '2026-10-01T10:00:00.000Z', friendIds: [ravi.id, asha.id] });

    actions().deleteFriend(ravi.id);

    const s = actions();
    expect(s.friends.map((f) => f.name)).toEqual(['Asha']);
    expect(s.interactions.map((i) => i.friendId)).toEqual([asha.id]);
    expect(s.gratitude.find((g) => g.id === solo.id)?.friendIds).toEqual([]);
    expect(s.gratitude.find((g) => g.id === both.id)?.friendIds).toEqual([asha.id]);
  });
});

describe('interactions', () => {
  it('logs, edits and deletes', () => {
    const f = actions().addFriend({ name: 'Ravi' });
    const i = actions().logInteraction({ friendId: f.id, type: 'texted', date: '2026-10-05T10:00:00.000Z', note: '  hi ' });
    expect(i.note).toBe('hi');
    actions().updateInteraction(i.id, { type: 'called', note: '' });
    expect(actions().interactions[0]).toMatchObject({ type: 'called', note: undefined });
    actions().deleteInteraction(i.id);
    expect(actions().interactions).toEqual([]);
  });

  it('clears the planned contact when logging on or after its day', () => {
    const f = actions().addFriend({ name: 'Ravi' });
    actions().setPlannedContact(f.id, { at: '2026-10-07T18:00:00.000Z', type: 'called' });
    actions().logInteraction({ friendId: f.id, type: 'texted', date: '2026-10-05T10:00:00.000Z' });
    expect(actions().friends[0].nextPlanned).toBeDefined();
    actions().logInteraction({ friendId: f.id, type: 'called', date: '2026-10-07T09:00:00.000Z' });
    expect(actions().friends[0].nextPlanned).toBeUndefined();
  });
});

describe('gratitude', () => {
  it('adds with trimmed text and de-duplicated friends, edits and deletes', () => {
    const g = actions().addGratitude({ text: ' Sunny walk ', date: '2026-10-07T10:00:00.000Z', friendIds: ['x', 'x'], tag: ' ' });
    expect(g).toMatchObject({ text: 'Sunny walk', friendIds: ['x'], tag: undefined });
    actions().updateGratitude(g.id, { text: 'Sunny morning walk', tag: 'nature' });
    expect(actions().gratitude[0]).toMatchObject({ text: 'Sunny morning walk', tag: 'nature' });
    actions().deleteGratitude(g.id);
    expect(actions().gratitude).toEqual([]);
  });
});

describe('settings & persistence', () => {
  it('defaults the daily prompt off and updates settings', () => {
    expect(actions().settings.dailyPromptEnabled).toBe(false);
    actions().updateSettings({ theme: 'warm-dark' });
    expect(actions().settings.theme).toBe('warm-dark');
  });

  it('persists data but not hasHydrated', () => {
    const { partialize, name, version } = useAppStore.persist.getOptions();
    expect(name).toBe('keepsake-store');
    expect(version).toBe(1);
    const persisted = partialize!(useAppStore.getState()) as Record<string, unknown>;
    expect(Object.keys(persisted).sort()).toEqual(['friends', 'gratitude', 'interactions', 'settings']);
  });
});
```

- [ ] **Step 2: Run** `npx jest src/store` → FAIL (module not found).

- [ ] **Step 3: Implement storage adapter and id**

`src/storage/adapter.ts`:
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

/** The only module that knows about the storage engine. Swap to MMKV here later. */
export const storageAdapter: StateStorage = {
  getItem: (name) => AsyncStorage.getItem(name),
  setItem: (name, value) => AsyncStorage.setItem(name, value),
  removeItem: (name) => AsyncStorage.removeItem(name),
};
```

`src/utils/id.ts`:
```ts
import * as Crypto from 'expo-crypto';

export const newId = (): string => Crypto.randomUUID();
```

- [ ] **Step 4: Implement store types, defaults, migrations**

`src/store/types.ts`:
```ts
import type { StateCreator } from 'zustand';

import type { FriendsSlice } from './friends-slice';
import type { GratitudeSlice } from './gratitude-slice';
import type { InteractionsSlice } from './interactions-slice';
import type { SettingsSlice } from './settings-slice';

export interface MetaSlice {
  hasHydrated: boolean;
}

export type AppState = FriendsSlice & InteractionsSlice & GratitudeSlice & SettingsSlice & MetaSlice;

export type PersistedState = Pick<AppState, 'friends' | 'interactions' | 'gratitude' | 'settings'>;

export type SliceCreator<T> = StateCreator<AppState, [['zustand/persist', unknown]], [], T>;
```

`src/store/defaults.ts`:
```ts
import type { Settings } from '@/types/models';

import type { PersistedState } from './types';

export const DEFAULT_SETTINGS: Settings = {
  dailyPromptEnabled: false,
  dailyPromptTime: '20:00',
  birthdayRemindersEnabled: false,
  reminderTime: '10:00',
  theme: 'system',
};

export const EMPTY_DATA: PersistedState = {
  friends: [],
  interactions: [],
  gratitude: [],
  settings: DEFAULT_SETTINGS,
};
```

`src/store/migrations.ts`:
```ts
import type { PersistedState } from './types';

/**
 * Upgrades persisted state written by an older STORE_VERSION.
 * v1 is the first schema, so there is nothing to migrate yet. Add a
 * `if (fromVersion < N)` block per future version, in ascending order.
 */
export function migratePersisted(state: unknown, fromVersion: number): PersistedState {
  void fromVersion;
  return state as PersistedState;
}
```

- [ ] **Step 5: Implement slices**

`src/store/friends-slice.ts`:
```ts
import type { Friend, FriendInput, ID, PlannedContact } from '@/types/models';
import { newId } from '@/utils/id';

import type { SliceCreator } from './types';

export interface FriendsSlice {
  friends: Friend[];
  addFriend: (input: FriendInput) => Friend;
  updateFriend: (id: ID, patch: Partial<FriendInput>) => void;
  setArchived: (id: ID, archived: boolean) => void;
  setPlannedContact: (id: ID, planned: PlannedContact | undefined) => void;
  deleteFriend: (id: ID) => void;
}

const TEXT_FIELDS = ['name', 'photoUri', 'phone', 'birthday', 'howWeMet', 'notes', 'group'] as const;

/** Trims text fields; blank optional fields become undefined. */
function tidy<T extends Partial<FriendInput>>(input: T): T {
  const out: Record<string, unknown> = { ...input };
  for (const key of TEXT_FIELDS) {
    const value = out[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      out[key] = trimmed === '' && key !== 'name' ? undefined : trimmed;
    }
  }
  return out as T;
}

export const createFriendsSlice: SliceCreator<FriendsSlice> = (set, get) => ({
  friends: [],

  addFriend: (input) => {
    const now = new Date().toISOString();
    const friend: Friend = { ...tidy(input), id: newId(), createdAt: now, updatedAt: now };
    set((s) => ({ friends: [...s.friends, friend] }));
    return friend;
  },

  updateFriend: (id, patch) => {
    const now = new Date().toISOString();
    const clean = tidy(patch);
    set((s) => ({
      friends: s.friends.map((f) => (f.id === id ? { ...f, ...clean, updatedAt: now } : f)),
    }));
  },

  setArchived: (id, archived) => get().updateFriend(id, { archived }),

  setPlannedContact: (id, planned) => get().updateFriend(id, { nextPlanned: planned }),

  deleteFriend: (id) => {
    const now = new Date().toISOString();
    set((s) => ({
      friends: s.friends.filter((f) => f.id !== id),
      interactions: s.interactions.filter((i) => i.friendId !== id),
      gratitude: s.gratitude.map((g) =>
        g.friendIds.includes(id)
          ? { ...g, friendIds: g.friendIds.filter((x) => x !== id), updatedAt: now }
          : g,
      ),
    }));
  },
});
```

`src/store/interactions-slice.ts`:
```ts
import { differenceInCalendarDays, parseISO } from 'date-fns';

import type { ID, Interaction, InteractionInput } from '@/types/models';
import { newId } from '@/utils/id';

import type { SliceCreator } from './types';

export interface InteractionsSlice {
  interactions: Interaction[];
  logInteraction: (input: InteractionInput) => Interaction;
  updateInteraction: (id: ID, patch: Partial<InteractionInput>) => void;
  deleteInteraction: (id: ID) => void;
}

const tidyNote = (note: string | undefined) => note?.trim() || undefined;

export const createInteractionsSlice: SliceCreator<InteractionsSlice> = (set) => ({
  interactions: [],

  logInteraction: (input) => {
    const now = new Date().toISOString();
    const interaction: Interaction = {
      ...input,
      note: tidyNote(input.note),
      id: newId(),
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({
      interactions: [...s.interactions, interaction],
      // A contact on/after the planned day fulfils the plan.
      friends: s.friends.map((f) =>
        f.id === input.friendId &&
        f.nextPlanned &&
        differenceInCalendarDays(parseISO(input.date), parseISO(f.nextPlanned.at)) >= 0
          ? { ...f, nextPlanned: undefined, updatedAt: now }
          : f,
      ),
    }));
    return interaction;
  },

  updateInteraction: (id, patch) => {
    const now = new Date().toISOString();
    set((s) => ({
      interactions: s.interactions.map((i) =>
        i.id === id
          ? {
              ...i,
              ...patch,
              ...('note' in patch ? { note: tidyNote(patch.note) } : {}),
              updatedAt: now,
            }
          : i,
      ),
    }));
  },

  deleteInteraction: (id) => set((s) => ({ interactions: s.interactions.filter((i) => i.id !== id) })),
});
```

`src/store/gratitude-slice.ts`:
```ts
import type { GratitudeEntry, GratitudeInput, ID } from '@/types/models';
import { newId } from '@/utils/id';

import type { SliceCreator } from './types';

export interface GratitudeSlice {
  gratitude: GratitudeEntry[];
  addGratitude: (input: GratitudeInput) => GratitudeEntry;
  updateGratitude: (id: ID, patch: Partial<GratitudeInput>) => void;
  deleteGratitude: (id: ID) => void;
}

function tidy(patch: Partial<GratitudeInput>): Partial<GratitudeInput> {
  const out: Partial<GratitudeInput> = { ...patch };
  if ('text' in patch) out.text = (patch.text ?? '').trim();
  if ('tag' in patch) out.tag = patch.tag?.trim() || undefined;
  if (patch.friendIds) out.friendIds = [...new Set(patch.friendIds)];
  return out;
}

export const createGratitudeSlice: SliceCreator<GratitudeSlice> = (set) => ({
  gratitude: [],

  addGratitude: (input) => {
    const now = new Date().toISOString();
    const entry: GratitudeEntry = {
      ...input,
      ...(tidy(input) as GratitudeInput),
      id: newId(),
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ gratitude: [...s.gratitude, entry] }));
    return entry;
  },

  updateGratitude: (id, patch) => {
    const now = new Date().toISOString();
    const clean = tidy(patch);
    set((s) => ({
      gratitude: s.gratitude.map((g) => (g.id === id ? { ...g, ...clean, updatedAt: now } : g)),
    }));
  },

  deleteGratitude: (id) => set((s) => ({ gratitude: s.gratitude.filter((g) => g.id !== id) })),
});
```

`src/store/settings-slice.ts`:
```ts
import type { Settings } from '@/types/models';

import { DEFAULT_SETTINGS } from './defaults';
import type { SliceCreator } from './types';

export interface SettingsSlice {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
}

export const createSettingsSlice: SliceCreator<SettingsSlice> = (set) => ({
  settings: DEFAULT_SETTINGS,
  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
});
```

- [ ] **Step 6: Implement store and hooks**

`src/store/index.ts`:
```ts
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storageAdapter } from '@/storage/adapter';

import { DEFAULT_SETTINGS } from './defaults';
import { createFriendsSlice } from './friends-slice';
import { createGratitudeSlice } from './gratitude-slice';
import { createInteractionsSlice } from './interactions-slice';
import { migratePersisted } from './migrations';
import { createSettingsSlice } from './settings-slice';
import type { AppState, PersistedState } from './types';

export const STORE_KEY = 'keepsake-store';
export const STORE_VERSION = 1;

export const useAppStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createFriendsSlice(...a),
      ...createInteractionsSlice(...a),
      ...createGratitudeSlice(...a),
      ...createSettingsSlice(...a),
      hasHydrated: false,
    }),
    {
      name: STORE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => storageAdapter),
      partialize: (s): PersistedState => ({
        friends: s.friends,
        interactions: s.interactions,
        gratitude: s.gratitude,
        settings: s.settings,
      }),
      migrate: (persisted, version) => migratePersisted(persisted, version),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedState>;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...p.settings } };
      },
      // AsyncStorage is async, so this runs after `useAppStore` is assigned.
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.warn('Keepsake: failed to load saved data', error);
        useAppStore.setState({ hasHydrated: true });
      },
    },
  ),
);

export type { AppState } from './types';
```

`src/store/hooks.ts`:
```ts
import type { ID } from '@/types/models';

import { useAppStore } from './index';

export const useFriends = () => useAppStore((s) => s.friends);
export const useFriend = (id: ID | undefined) =>
  useAppStore((s) => (id ? s.friends.find((f) => f.id === id) : undefined));
export const useInteractions = () => useAppStore((s) => s.interactions);
export const useGratitude = () => useAppStore((s) => s.gratitude);
export const useSettings = () => useAppStore((s) => s.settings);
export const useHasHydrated = () => useAppStore((s) => s.hasHydrated);

/** Imperative access to actions from event handlers (no re-render subscription). */
export const appActions = () => useAppStore.getState();
```

- [ ] **Step 7: Run** `npx jest` → all PASS; `npx tsc --noEmit` → clean.

- [ ] **Step 8: Commit** — `feat: persisted single store with domain slices`

---

### Task 5: Theme system and base UI components

**Files:**
- Create: `src/theme/palettes.ts`, `src/theme/tokens.ts`, `src/theme/use-color-scheme.ts`, `src/theme/use-color-scheme.web.ts`, `src/theme/use-theme.ts`
- Create: `src/components/{themed-text,screen,screen-header,card,button,icon-button,chip,avatar,text-field,date-field,empty-state,fab,section-title}.tsx`, `src/utils/confirm.ts`

**Interfaces — Produces:**
- `palettes: Record<'light' | 'dark', Palette>` where `Palette` keys: `background, surface, surfaceAlt, primary, primarySoft, onPrimary, secondary, secondarySoft, accent, accentSoft, success, successSoft, warning, warningSoft, text, textSecondary, border, shadow`
- `spacing {xs:4, sm:8, md:12, lg:16, xl:24, xxl:32}`, `radius {sm:10, md:16, lg:24, pill:999}`, `fonts {display, displayItalic, body, bodyMedium, bodyBold}`, `typeScale {title:30, heading:22, subheading:18, body:16, small:14}`
- `useTheme(): { scheme: 'light' | 'dark'; colors: Palette; spacing; radius; fonts; typeScale }` — resolves `settings.theme` (`system` → device scheme)
- `ThemedText` props: `variant?: 'title' | 'heading' | 'subheading' | 'body' | 'bodyStrong' | 'small' | 'smallStrong'`, `color?: keyof Palette`, plus `TextProps`
- `Screen` props: `{ children; scroll?: boolean; padded?: boolean; edges?: Edge[] }` — safe area, background, `maxWidth: 640` centered (web)
- `Card` props: `ViewProps & { tone?: 'surface' | 'accent' | 'warning' | 'success'; onPress?: () => void }`
- `Button` props: `{ label; onPress; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: IconName; disabled?; testID? }` (minHeight 48)
- `IconButton` props: `{ icon: IconName; onPress; accessibilityLabel: string; tone?: 'primary' | 'accent' | 'neutral'; size?: number }` (44×44 min)
- `Chip` props: `{ label; selected?; onPress?; icon?: IconName; testID? }`
- `Avatar` props: `{ name: string; size?: number }` — initials on a warm tone chosen by name hash
- `TextField` props: `TextInputProps & { label: string; error?: string; hint?: string }`
- `DateField` props: `{ label; value: ISODate; onChange(v: ISODate); mode: 'past' | 'future'; withTime?: boolean }` — formatted date, ‹ › day steppers (past mode can't go beyond today), quick chips (past: Today/Yesterday/2 days ago; future: Tomorrow/In 3 days/Next week), and with `withTime` an hour row (Morning 9 / Noon 12 / Evening 18 / Night 20)
- `EmptyState` props: `{ icon: IconName; title; message; actionLabel?; onAction? }`
- `Fab` props: `{ icon?: IconName; label: string; onPress }` — bottom-right, primary, shadow, press-scale animation
- `SectionTitle` props: `{ title; actionLabel?; onAction? }`
- `ScreenHeader` props: `{ eyebrow?: string; title: string; subtitle?: string; right?: ReactNode }` — eyebrow small caps in `primary`, title in display font
- `confirm(opts: { title; message; confirmLabel; destructive? }): Promise<boolean>` — `window.confirm` on web, `Alert.alert` on native

Palette values (light / dark):

| key | light | dark |
|---|---|---|
| background | `#FBF6EE` | `#1F1814` |
| surface | `#FFFBF5` | `#2A211C` |
| surfaceAlt | `#F5EDE1` | `#352A23` |
| primary | `#C8553D` | `#E07A5F` |
| primarySoft | `#F6E1D9` | `#4A2E25` |
| onPrimary | `#FFFBF5` | `#1F1814` |
| secondary | `#E0A458` | `#E9B872` |
| secondarySoft | `#F8EAD3` | `#43362A` |
| accent | `#D98880` | `#D9958F` |
| accentSoft | `#F7E3E0` | `#45302D` |
| success | `#6F8A5B` | `#A3B88F` |
| successSoft | `#E7EDDF` | `#2F3528` |
| warning | `#A9652A` | `#E9B872` |
| warningSoft | `#F8EAD3` | `#43362A` |
| text | `#3B2F2A` | `#F2E8DC` |
| textSecondary | `#7A6A60` | `#B5A495` |
| border | `#E8DCCB` | `#3D312A` |
| shadow | `#6B4A35` | `#000000` (shadow only) |

(`success` light is darkened from `#8FA67A` and `warning` is a text-safe amber so both meet WCAG AA on cream; the raw plan colors remain available as `*Soft` backgrounds.)

- [ ] **Step 1:** Write `palettes.ts`, `tokens.ts`, `use-color-scheme(.web).ts` (web version returns `'light'` until mounted, as in the template), `use-theme.ts`.
- [ ] **Step 2:** Write `confirm.ts` and all components listed above using only `useTheme()` values.
- [ ] **Step 3: Verify** `npx tsc --noEmit` → clean; `npx jest` → PASS.
- [ ] **Step 4: Commit** — `feat: warm theme system and base components`

---

### Task 6: Navigation shell with hydration gate

**Files:**
- Create: `src/app/_layout.tsx`, `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/{index,friends,gratitude,settings}.tsx` (titles only for now)
- Delete: `src/app/index.tsx` placeholder

**Behaviour:**
- Root layout: `SplashScreen.preventAutoHideAsync()`; load `Fraunces_600SemiBold`, `Fraunces_600SemiBold_Italic`, `Nunito_400Regular`, `Nunito_600SemiBold`, `Nunito_700Bold`; render nothing until fonts loaded **and** `useHasHydrated()`; then `SplashScreen.hideAsync()`.
- `ThemeProvider` (from `expo-router`) with a nav theme built from the palette (background, card=surface, text, border, primary).
- Root `Stack` with themed header (`headerStyle.backgroundColor = background`, `headerShadowVisible: false`, title font = display), `contentStyle.backgroundColor = background`. Screens: `(tabs)` (no header), `friend/[id]` (title "Friend"), `friend/edit` (`presentation: 'modal'`), `log-interaction` (`presentation: 'modal'`, title "Log a moment"), `add-gratitude` (`presentation: 'modal'`, title "Gratitude").
- Tabs: Home (`home-outline`), Friends (`people-outline`), Gratitude (`heart-outline`), Settings (`settings-outline`); active tint `primary`, inactive `textSecondary`, bar background `surface`, top border `border`, label font `bodyMedium`, `headerShown: false` (screens render their own `ScreenHeader`).
- `StatusBar` style follows resolved scheme.

- [ ] **Step 1:** Implement layouts and four stub tab screens using `Screen` + `ThemedText variant="title"`.
- [ ] **Step 2: Verify** `npx tsc --noEmit`; start `npx expo start --web --port 8081`; in browser confirm four tabs render in warm palette with Fraunces titles.
- [ ] **Step 3: Commit** — `feat: navigation shell with hydration gate`

---

### Task 7: Add/edit friend and Friends tab

**Files:**
- Create: `src/app/friend/edit.tsx`, `src/components/friend-row.tsx`
- Modify: `src/app/(tabs)/friends.tsx`

**Behaviour — `friend/edit.tsx`** (param `id?`; title "New friend" / "Edit friend"):
- Fields: Name* (`TextField`, autofocus when new), Phone (`keyboardType="phone-pad"`), Birthday (placeholder "MM-DD or YYYY-MM-DD", validated with `isValidBirthday`, error "Use MM-DD or YYYY-MM-DD"), Group (chips of `collectGroups(friends)` + free-text field), How we met, Notes (multiline).
- "Stay in touch every" chips: None / 7 days / 14 days / 30 days / Custom (Custom reveals numeric field; must be positive integer, error "Enter a number of days").
- Save button disabled while name empty; on save → `addFriend` (then `router.replace` to `/friend/[id]`) or `updateFriend` (then `router.back()`).
- Edit mode only, at bottom: "Archive"/"Unarchive" (secondary) and "Delete friend" (danger, `confirm` "Delete Ravi? Their logged moments will be removed. Gratitude notes stay in your journal as general gratitude.") → `deleteFriend`, `router.dismissTo('/friends')`.

**Behaviour — Friends tab:**
- `ScreenHeader` "Friends" with subtitle "{n} people you care about" and an "Add" `IconButton` (`person-add-outline`) → `/friend/edit`.
- Search `TextField` (placeholder "Search friends") filtering by name (case-insensitive).
- Group chips: All, each group, Archived (archived hidden unless selected).
- `FlatList` of `FriendRow` `{ friend, last, now, onPress }`: `Avatar`, name, group, `formatLastContact`, chevron.
- Empty state (no friends): icon `people-outline`, "Your circle starts here", "Add the people you want to stay close to.", action "Add a friend". No search results: "No one by that name".

- [ ] **Step 1:** Implement both screens and `FriendRow`.
- [ ] **Step 2: Verify** tsc clean; in browser add "Ravi Kumar" (group college, every 14 days), see him listed; edit; search; archive filter works.
- [ ] **Step 3: Commit** — `feat: friend add/edit and friends list`

---

### Task 8: Friend detail with planned contact

**Files:**
- Create: `src/app/friend/[id].tsx`, `src/components/timeline-item.tsx`, `src/components/gratitude-card.tsx`, `src/components/plan-contact-panel.tsx`, `src/components/status-pill.tsx`

**Interfaces:**
- `TimelineItem { interaction: Interaction; now: Date; onPress(): void }` — type icon in soft circle, past-tense label, `formatDay`, note.
- `GratitudeCard { entry: GratitudeEntry; friends: Friend[]; now: Date; onPress(): void }` — rose accent bar, text (serif italic), date, tag chip, linked friend names or "Life" label for general.
- `StatusPill { status: ContactStatus; daysUntilDue?: number }` — overdue: warningSoft/warning "It's been a while"; soon: secondarySoft "Due {relativeDays(-d)}" (e.g. "Due today", "Due in 2 days"); ok: successSoft/success "On track"; none: renders nothing.
- `PlanContactPanel { friend: Friend; onDone(): void }` — type chips (4), `DateField mode="future" withTime`, Save → `setPlannedContact`, "Clear plan" when one exists.

**Behaviour — detail screen:**
- Header title = friend name; header right "Edit" → `/friend/edit?id=`.
- Hero: large `Avatar`, name (title), group · how we met, `StatusPill`, `statusMessage` line if any; birthday line "Birthday 12 Mar · in 12 days".
- Quick actions row: Log (`/log-interaction?friendId=`), Call (only if phone; `Linking.openURL('tel:…')`), Gratitude (`/add-gratitude?friendId=`).
- Stats card: Last contact (`formatLastContact`), Stay in touch ("Every 14 days" / "No rhythm set"), Next planned (`formatDayTime` + type, or "Nothing planned") with "Plan next contact" button toggling `PlanContactPanel` inline.
- Sections: "Moments" (`TimelineItem` list, tap → `/log-interaction?interactionId=`; empty: "No moments logged yet") and "Grateful for" (`GratitudeCard` list, tap → `/add-gratitude?entryId=`; empty: "Nothing noted yet").
- Notes card if notes present. Missing friend → `EmptyState` "This friend isn't here anymore".

- [ ] **Step 1:** Implement components and screen.
- [ ] **Step 2: Verify** tsc clean; browser: open Ravi, plan a call for tomorrow evening, see it in stats; clear it.
- [ ] **Step 3: Commit** — `feat: friend detail with timeline and planned contact`

---

### Task 9: Log interaction modal

**Files:** Create `src/app/log-interaction.tsx`, `src/components/friend-picker.tsx`

**Interfaces:** `FriendPicker { friends: Friend[]; selected: ID[]; onChange(ids: ID[]): void; multiple?: boolean }` — search field (shown when >8 friends) + wrapping `Chip`s with `Avatar` initials; non-archived only.

**Behaviour:**
- Params: `friendId?`, `interactionId?`. Edit mode pre-fills from the interaction (and locks friend).
- If no `friendId` and not editing: "Who did you connect with?" `FriendPicker` (single). If there are no friends at all: `EmptyState` with "Add a friend" → `/friend/edit`.
- "How?" — four large type tiles (icon + label from `INTERACTION_META`), selected tile uses `primarySoft` bg + `primary` border. Default `called`.
- "When?" — `DateField mode="past"` (default now).
- "Anything to remember?" — optional multiline note.
- Save (label "Save moment") → `logInteraction` / `updateInteraction` → `router.back()`. Edit mode: "Delete" (danger + `confirm`) → `deleteInteraction`.
- Fast path: friend preselected → type + Save = 2 taps.

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify** tsc; browser: log a call for Ravi from detail; appears in timeline; last contact updates; edit + delete work.
- [ ] **Step 3: Commit** — `feat: log interaction modal`

---

### Task 10: Gratitude modal and Gratitude tab

**Files:** Create `src/app/add-gratitude.tsx`; Modify `src/app/(tabs)/gratitude.tsx`

**Behaviour — modal:**
- Params `friendId?` (preselects), `entryId?` (edit).
- Large multiline text field, placeholder rotates from: "What made you smile today?", "Who helped you recently?", "A small moment worth keeping…".
- "When?" `DateField mode="past"`.
- "Linked to" `FriendPicker multiple` with helper text "Leave empty for general gratitude".
- "Tag" chips: health, work, family, friends, nature, small joys (toggle; single).
- Save disabled until text non-empty → `addGratitude` / `updateGratitude` → back. Edit: Delete with confirm.

**Behaviour — tab:**
- `ScreenHeader` "Gratitude" subtitle "{n} moments kept".
- Filter chips: All, Life (general only), then one chip per friend that has entries.
- `SectionList` grouped by month ("October 2026"), `GratitudeCard` items, tap → edit.
- `Fab` "Add gratitude" → `/add-gratitude`.
- Empty: icon `heart-outline`, "Start a little gratitude habit", "Note one good thing — a person, a moment, a sunny walk.", action "Write the first one".

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify** tsc; browser: add general + friend-linked entries; filters work; entry shows on friend detail.
- [ ] **Step 3: Commit** — `feat: gratitude journal and timeline`

---

### Task 11: Home dashboard

**Files:** Create `src/components/friend-card.tsx`, Modify `src/app/(tabs)/index.tsx`

**Interfaces:** `FriendCard { entry: DashboardEntry; now: Date; onPress(); onLog(); onCall?(); onGratitude() }`.

**Behaviour — FriendCard:**
- Row: `Avatar`, name (subheading), `StatusPill`.
- `statusMessage` line (warning color) when overdue/soon.
- "Last contact": `formatLastContact` with type icon.
- Latest gratitude: quoted, italic serif, 2-line clamp, rose left border (omitted if none).
- Next planned: "Planned: {type} · {formatDayTime}" (omitted if none).
- Action row: Log (`add-circle-outline`), Call (only if `onCall`), Gratitude (`heart-outline`) as small pill buttons (≥44 px tall).
- Overdue cards get a soft `warningSoft` top band; never red.

**Behaviour — Home:**
- Header (`ScreenHeader`): eyebrow = greeting by hour ("Good morning" <12, "Good afternoon" <17, else "Good evening"), title "How long has it been?" (Fraunces), subtitle summarising: "{k} friends would love to hear from you" when any overdue, else "You're nicely in touch".
- `FlatList` of `FriendCard` from `buildDashboard(friends, interactions, gratitude, now)` memoised on store arrays.
- `Fab` "Log a moment" → `/log-interaction`.
- Empty (no friends): illustration-free `EmptyState` icon `sparkles-outline`, "Keep your people close", "Add a friend and Keepsake will gently remind you when it's been a while.", action "Add your first friend".
- Fade/slide-in of cards on mount via `react-native-reanimated` `FadeInDown` with small stagger (index × 40 ms, capped).

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Verify** tsc; browser: with 3+ friends (one overdue via backdated log), ordering is overdue-first; quick actions open modals with friend preselected.
- [ ] **Step 3: Commit** — `feat: how-long-has-it-been dashboard`

---

### Task 12: Settings tab and final verification

**Files:** Modify `src/app/(tabs)/settings.tsx`; Modify `README.md` (create)

**Behaviour — Settings:**
- `ScreenHeader` "Settings".
- "Appearance" card: chips System / Warm light / Warm dark → `updateSettings({ theme })`; change is instant.
- "Reminders" card (muted, `Coming soon` pill): "Gentle nudges when it's been a while, planned-call alerts and an optional daily gratitude prompt."
- "Your data" card (muted, `Coming soon` pill): "Everything stays on this phone. Export and import backups are on the way." plus counts: "{f} friends · {i} moments · {g} gratitude notes".
- Footer: "Keepsake · v{expo config version}" via `expo-constants`.

**README.md:** what it is, `npm install`, `npx expo start`, `npm test`, `npm run typecheck`, project structure summary, link to plan/spec.

- [ ] **Step 1:** Implement settings + README.
- [ ] **Step 2: Full verification**
  - `npx jest` → all pass
  - `npx tsc --noEmit` → clean
  - `npx expo lint` → no errors
  - `npx expo export --platform web` → succeeds
  - Browser pass (light + dark): empty states, add friend, log, gratitude, dashboard order, theme switch, reload persists data.
- [ ] **Step 3: Commit** — `feat: settings screen, README, MVP complete`
