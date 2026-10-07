# Keepsake MVP (Phases 1–2) — Design

Source product spec: [`plan.md`](../../../plan.md). This document records the
decisions made for the first implementation pass and anything that refines or
deviates from `plan.md`.

## Scope

**In scope (Phases 1–2):**
- Expo + TypeScript (strict) + Expo Router project, warm theme system, storage adapter
- Single persisted Zustand store with hydration gate and versioned migrations
- Friend CRUD (incl. archive + delete), interaction log CRUD, gratitude CRUD
- Home "How long has it been?" dashboard, Friends list, Friend detail, Gratitude timeline
- Repeat-interval logic (derived due dates and status)
- Planned contact stored as data (date + type), shown on cards

**Out of scope (later phases):** notifications/reminders/snooze, export/import,
backup nudges, memory of the day, daily prompt, haptics, date-range filter,
contacts import.

## Resolved open decisions (plan §13)

1. Photos are **not** included in backups in v1 (URI only).
2. Friends have an optional `phone`. The "Call" quick action opens the dialer
   (`tel:`) and is hidden when no phone number is stored.
3. Daily gratitude prompt will be **opt-in** (default `false`).
4. Deleting a friend **keeps** their gratitude entries: the friend's ID is removed
   from `friendIds`; entries with no friends left become general gratitude.
   The friend's interactions are deleted.

## Architecture

### State: one store, domain slices (Approach A)

`src/store/` contains a single Zustand store persisted under one AsyncStorage key
(`keepsake-store`) via `persist` + `createJSONStorage(() => storageAdapter)`.

State shape:
```ts
{
  friends: Friend[];
  interactions: Interaction[];
  gratitude: GratitudeEntry[];
  settings: Settings;
  hasHydrated: boolean; // not persisted
}
```

- Actions live alongside state, grouped by domain (friends / interactions /
  gratitude / settings). Each domain is defined in its own slice file and
  combined in `src/store/index.ts`.
- Thin hooks per domain (`useFriends`, `useInteractions`, `useGratitude`,
  `useSettings`) select from the root store, so components read naturally.
- Cross-domain actions (`deleteFriend`) update all affected slices in a single
  `set()` call, so they are atomic.
- `persist` config: `version: 1`, `migrate` function (identity for v1),
  `partialize` excludes `hasHydrated`, `onRehydrateStorage` sets `hasHydrated`.
- Root layout shows a splash/loading view until `hasHydrated` is true.

### Storage adapter

`src/storage/adapter.ts` exports a `StateStorage`-compatible object backed by
AsyncStorage. It is the only module that imports AsyncStorage.

### Data model

As in plan §4, with these refinements:
- `Friend.phone?: string` added.
- `Settings` defaults: `dailyPromptEnabled: false`, `dailyPromptTime: "20:00"`,
  `birthdayRemindersEnabled: false`, `reminderTime: "10:00"`, `theme: "system"`.
- IDs from `expo-crypto` `randomUUID()`, accessed via `src/utils/id.ts`
  so tests can run without native modules.
- All entities carry `createdAt`; `Friend` also carries `updatedAt`.
  `Interaction` and `GratitudeEntry` gain `updatedAt` too (needed for import
  merge in Phase 4).

### Derived values (pure functions, `src/utils/`)

All take an explicit `now: Date` parameter for deterministic tests.

- `lastInteraction(friendId, interactions)` → most recent by `date`.
- `daysSince(dateISO, now)` → whole calendar days.
- `dueDate(friend, lastInteraction)` → `(last.date ?? friend.createdAt) + repeatEveryDays`;
  `undefined` when no repeat interval.
- `contactStatus(friend, lastInteraction, now)` →
  `'none'` (no interval) | `'ok'` | `'soon'` (due within 2 days) | `'overdue'`.
- `sortFriendsForDashboard(friends, interactions, now)` → non-archived friends
  ordered: overdue first (most overdue first), then by longest time since last
  contact; never-contacted friends rank by `createdAt`.
- `latestGratitudeForFriend(friendId, gratitude)`, `generalGratitude(gratitude)`.
- `formatLastContact(interaction, now)` → e.g. "Called 12 days ago", "Met today".

Logging an interaction resets the countdown automatically because due dates are
derived from the latest interaction.

### Theme

`src/theme/`: `palettes.ts` (warm-light / warm-dark from plan §8), `tokens.ts`
(spacing, radii, type scale — body ≥ 16), `useTheme()` resolving
`settings.theme` against `useColorScheme()`. Fonts loaded with `expo-font`:
a serif display face for headings (journal feel) and a rounded sans for body.
Overdue uses amber/coral, never red; copy is gentle ("It's been a while").

### Navigation & screens (Expo Router)

Expo SDK 57 keeps routes in `src/app/` (template convention); JS `Tabs`
are bundled in `expo-router`. Web uses `"output": "single"` (client-only SPA)
because all data is device-local. Dates are picked with a custom `DateField`
(day steppers + quick chips) that works identically on iOS, Android and web.

```
src/app/
  _layout.tsx               # fonts, hydration gate, theme, Stack
  (tabs)/_layout.tsx        # bottom tabs
  (tabs)/index.tsx          # Home dashboard + FAB
  (tabs)/friends.tsx        # list, search, group chips, add
  (tabs)/gratitude.tsx      # timeline, filter (all / general / friend) + FAB
  (tabs)/settings.tsx       # theme picker; placeholders for reminders/backup
  friend/[id].tsx           # detail: stats, timeline, gratitude, edit/delete
  friend/edit.tsx           # add/edit form (id param optional)
  log-interaction.tsx       # modal; params friendId?, interactionId?
  add-gratitude.tsx         # modal; params friendId?, entryId?
```

Planned contact (date + type) is set or cleared from the Friend detail screen
("Plan next contact" sheet) and shown on the dashboard card. Logging an
interaction dated on or after the planned date clears it.

Components in `src/components/`: `FriendCard`, `GratitudeCard`, `TimelineItem`,
`EmptyState`, `Fab`, `Chip`, `Avatar`, `ScreenHeader`, `TextField`,
`DateField`, `Button`.

## Error handling

- Form validation: friend name required; gratitude text required; repeat
  interval must be a positive integer.
- Destructive actions (delete friend / entry) confirm via `Alert`.
- Missing entity on detail/edit routes → friendly "not found" empty state.

## Testing

- `jest-expo` preset; tests in `__tests__/` next to source.
- Test-first for: date helpers, derived/selector functions, store actions
  (including `deleteFriend` cascade and gratitude unlinking).
- Verification gates: `npx jest`, `npx tsc --noEmit`,
  `npx expo export --platform web`, and a manual browser pass on the web target.
