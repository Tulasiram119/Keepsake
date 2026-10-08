# Keepsake Phase 3: Reminders & Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement local notifications for cadence due-reminders, planned contacts, snooze/skip actions, birthday reminders, and daily gratitude reflection prompts.

**Architecture:** A dedicated notification service (`src/services/notifications.ts`) powered by `expo-notifications` with a foreground handler, Android channel setup, and a central idempotent resync engine (`syncAllNotifications`) called when reminder-relevant data changes. All state changes (snooze, skip, settings toggles) are managed in Zustand slices and persisted to AsyncStorage.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript 6 (strict), Zustand 5, `expo-notifications`, `date-fns` 4, `jest-expo`.

**Spec:** `docs/superpowers/specs/2026-10-08-keepsake-phase-3-reminders-design.md`

## Global Constraints

- Install packages via `npx expo install <pkg>` (never raw `npm install`).
- TypeScript `strict: true`; no `any`.
- Keep Web and Jest environments safe from native crashes using platform guards and mocks.
- Overdue and reminder copy must remain gentle, warm, and guilt-free ("It's been a while since you spoke with {name}").
- Derived values remain computed from explicit `now` timestamps.

---

### Task 1: Package installation, Jest mock & Model/Default extensions

**Files:**
- Modify: `package.json`
- Modify: `jest.setup.ts`
- Modify: `src/types/models.ts`
- Modify: `src/store/defaults.ts`
- Modify: `src/store/types.ts`

**Interfaces:**
- Produces: `Friend.snoozedUntil?: ISODate`
- Produces: `Settings` fields: `reminderTime: string`, `dailyPromptEnabled: boolean`, `dailyPromptTime: string`, `birthdayRemindersEnabled: boolean`
- Produces: `DEFAULT_SETTINGS` in `src/store/defaults.ts`

- [x] **Step 1: Install `expo-notifications`**

```bash
npx expo install expo-notifications
```

- [x] **Step 2: Add Jest mock for `expo-notifications` in `jest.setup.ts`**

Add the following mock to `jest.setup.ts`:

```ts
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted', granted: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted', granted: true }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('test-notification-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  AndroidImportance: {
    HIGH: 4,
    DEFAULT: 3,
  },
}));
```

- [x] **Step 3: Update `src/types/models.ts`**

Extend `Friend` with `snoozedUntil?: ISODate` and `Settings` with notification settings:

```ts
export interface Friend {
  id: ID;
  name: string;
  photoUri?: string;
  phone?: string;
  birthday?: string;          // "MM-DD" or "YYYY-MM-DD"
  howWeMet?: string;
  notes?: string;
  group?: string;
  repeatEveryDays?: number;   // undefined = no cadence
  nextPlanned?: PlannedContact;
  snoozedUntil?: ISODate;     // ISO timestamp if cadence reminder is snoozed
  createdAt: ISODate;
  updatedAt: ISODate;
  archived?: boolean;
}

export interface Settings {
  theme: ThemePreference;
  reminderTime: string;       // e.g. "10:00"
  dailyPromptEnabled: boolean; // default false
  dailyPromptTime: string;    // e.g. "20:00"
  birthdayRemindersEnabled: boolean; // default true
}
```

- [x] **Step 4: Update `src/store/defaults.ts`**

```ts
import type { Settings } from '@/types/models';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  reminderTime: '10:00',
  dailyPromptEnabled: false,
  dailyPromptTime: '20:00',
  birthdayRemindersEnabled: true,
};
```

- [x] **Step 5: Verify tests and typecheck**

Run: `npm test && npm run typecheck`  
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add package.json package-lock.json jest.setup.ts src/types/models.ts src/store/defaults.ts
git commit -m "feat(reminders): install expo-notifications, add mock, and extend settings and friend types"
```

---

### Task 2: Snooze-aware Cadence Logic in `src/utils/derived.ts`

**Files:**
- Modify: `src/utils/derived.ts`
- Test: `src/utils/__tests__/derived.test.ts`

**Interfaces:**
- Consumes: `Friend.snoozedUntil`
- Produces: `CadenceStatus = 'none' | 'on-track' | 'due' | 'overdue' | 'snoozed'`
- Produces: updated `computeCadenceStatus` and `buildDashboard` respecting snooze

- [x] **Step 1: Write failing tests in `src/utils/__tests__/derived.test.ts`**

Add tests for `snoozedUntil`:

```ts
describe('computeCadenceStatus with snooze', () => {
  it('returns snoozed when snoozedUntil is in the future even if overdue by interval', () => {
    const friend: Friend = {
      id: 'f1',
      name: 'Elena',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      repeatEveryDays: 7,
      snoozedUntil: '2026-10-10T10:00:00.000Z',
    };
    const now = new Date('2026-10-08T12:00:00.000Z');
    const status = computeCadenceStatus(friend, '2026-09-10T00:00:00.000Z', now);
    expect(status).toBe('snoozed');
  });

  it('resumes normal status once snoozedUntil has passed', () => {
    const friend: Friend = {
      id: 'f1',
      name: 'Elena',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      repeatEveryDays: 7,
      snoozedUntil: '2026-10-05T10:00:00.000Z',
    };
    const now = new Date('2026-10-08T12:00:00.000Z');
    const status = computeCadenceStatus(friend, '2026-09-10T00:00:00.000Z', now);
    expect(status).toBe('overdue');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest src/utils/__tests__/derived.test.ts -t "with snooze"`  
Expected: FAIL

- [x] **Step 3: Update `src/utils/derived.ts`**

Update `CadenceStatus` type and `computeCadenceStatus`:

```ts
export type CadenceStatus = 'none' | 'on-track' | 'due' | 'overdue' | 'snoozed';

export function computeCadenceStatus(
  friend: Friend,
  lastInteractionDate: ISODate | undefined,
  now: Date,
): CadenceStatus {
  if (!friend.repeatEveryDays || friend.repeatEveryDays <= 0) return 'none';

  // Check if snooze is currently active
  if (friend.snoozedUntil) {
    try {
      const snoozeDate = parseISO(friend.snoozedUntil);
      if (snoozeDate > now) {
        return 'snoozed';
      }
    } catch {
      // ignore malformed snooze date
    }
  }

  const baseDateStr = lastInteractionDate ?? friend.createdAt;
  const base = parseISO(baseDateStr);
  const target = addDays(base, friend.repeatEveryDays);

  if (isAfter(now, target)) {
    if (differenceInDays(now, target) >= 1) return 'overdue';
    return 'due';
  }
  return 'on-track';
}
```

In `buildDashboard`:
Ensure `snoozed` status entries are not treated as overdue:
```ts
const isOverdue = status === 'overdue' || status === 'due';
```

- [x] **Step 4: Run tests to verify all pass**

Run: `npx jest src/utils/__tests__/derived.test.ts`  
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/utils/derived.ts src/utils/__tests__/derived.test.ts
git commit -m "feat(reminders): add snooze handling to cadence calculations"
```

---

### Task 3: Store Actions for Snooze, Skip, and Notifications Sync

**Files:**
- Modify: `src/store/friends-slice.ts`
- Modify: `src/store/settings-slice.ts`
- Modify: `src/store/hooks.ts`
- Test: `src/store/__tests__/store.test.ts`

**Interfaces:**
- Produces: `snoozeFriend(id: ID, days: number)`
- Produces: `skipCycle(id: ID)`
- Produces: `clearSnooze(id: ID)`
- Produces: `logInteraction` clearing `snoozedUntil`

- [x] **Step 1: Write failing tests in `src/store/__tests__/store.test.ts`**

```ts
it('snoozes a friend, skips cycle, and clears snooze when moment is logged', () => {
  const friend = store.getState().addFriend({ name: 'Sam', repeatEveryDays: 7 });
  expect(store.getState().friends[0].snoozedUntil).toBeUndefined();

  // Snooze 3 days
  store.getState().snoozeFriend(friend.id, 3);
  const snoozed = store.getState().friends.find((f) => f.id === friend.id);
  expect(snoozed?.snoozedUntil).toBeDefined();

  // Logging interaction clears snooze
  store.getState().addInteraction({
    friendId: friend.id,
    type: 'called',
    date: new Date().toISOString(),
  });
  const updated = store.getState().friends.find((f) => f.id === friend.id);
  expect(updated?.snoozedUntil).toBeUndefined();
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest src/store/__tests__/store.test.ts`  
Expected: FAIL

- [x] **Step 3: Implement actions in `src/store/friends-slice.ts`**

Add methods to `FriendsSlice`:
```ts
export interface FriendsSlice {
  friends: Friend[];
  addFriend: (input: FriendInput) => Friend;
  updateFriend: (id: ID, patch: Partial<FriendInput>) => void;
  setArchived: (id: ID, archived: boolean) => void;
  setPlannedContact: (id: ID, planned: PlannedContact | undefined) => void;
  snoozeFriend: (id: ID, days: number) => void;
  skipCycle: (id: ID) => void;
  clearSnooze: (id: ID) => void;
  deleteFriend: (id: ID) => void;
}
```

Implement in `createFriendsSlice`:
```ts
snoozeFriend: (id, days) => {
  const until = addDays(new Date(), days).toISOString();
  get().updateFriend(id, { snoozedUntil: until });
},

skipCycle: (id) => {
  const friend = get().friends.find((f) => f.id === id);
  const interval = friend?.repeatEveryDays ?? 7;
  const until = addDays(new Date(), interval).toISOString();
  get().updateFriend(id, { snoozedUntil: until });
},

clearSnooze: (id) => {
  get().updateFriend(id, { snoozedUntil: undefined });
},
```

In `src/store/interactions-slice.ts`, on `addInteraction`:
```ts
// Clear any active snooze on the friend when interaction is logged
get().clearSnooze(input.friendId);
```

In `src/store/hooks.ts`:
Expose `snoozeFriend`, `skipCycle`, `clearSnooze` in `appActions()`.

- [x] **Step 4: Run tests to verify all pass**

Run: `npx jest src/store/__tests__/store.test.ts`  
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/store/friends-slice.ts src/store/interactions-slice.ts src/store/hooks.ts src/store/__tests__/store.test.ts
git commit -m "feat(reminders): add snooze, skip, and reset-on-interaction store actions"
```

---

### Task 4: Notification Service (`src/services/notifications.ts`)

**Files:**
- Create: `src/services/notifications.ts`
- Create: `src/services/__tests__/notifications.test.ts`

**Interfaces:**
- Produces: `requestNotificationPermissionsAsync(): Promise<boolean>`
- Produces: `getNotificationPermissionStatusAsync(): Promise<boolean>`
- Produces: `syncAllNotifications(state: AppState, now?: Date): Promise<void>`
- Produces: `schedulePlannedNotification(friend: Friend): Promise<string | undefined>`
- Produces: `cancelNotification(notificationId: string): Promise<void>`

- [x] **Step 1: Write test `src/services/__tests__/notifications.test.ts`**

```ts
import * as Notifications from 'expo-notifications';
import { syncAllNotifications } from '../notifications';
import type { AppState } from '@/store/types';
import { DEFAULT_SETTINGS } from '@/store/defaults';

describe('syncAllNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cancels all and schedules cadence and daily prompt notifications', async () => {
    const mockState: Partial<AppState> = {
      friends: [
        {
          id: 'f1',
          name: 'Priya',
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
          repeatEveryDays: 7,
        },
      ],
      interactions: [],
      gratitude: [],
      settings: {
        ...DEFAULT_SETTINGS,
        dailyPromptEnabled: true,
      },
    };

    const now = new Date('2026-10-05T00:00:00.000Z');
    await syncAllNotifications(mockState as AppState, now);

    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    // Should schedule cadence for Priya and daily prompt
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest src/services/__tests__/notifications.test.ts`  
Expected: FAIL (module not found)

- [x] **Step 3: Implement `src/services/notifications.ts`**

Implement full service:
- Initialize Android channel and notification handler if native platform (`Platform.OS !== 'web'`).
- Permissions request / get helpers.
- Helper to compute upcoming birthday date string from `MM-DD` or `YYYY-MM-DD`.
- Helper to parse `HH:mm` time string into Date.
- `syncAllNotifications`:
  - Guard: if on web, return early.
  - Cancel all previously scheduled notifications.
  - Schedule cadence reminders for friends with `repeatEveryDays`.
  - Schedule planned contact reminders for friends with `nextPlanned.at > now`.
  - Schedule birthday reminders if enabled for upcoming birthdays.
  - Schedule daily gratitude prompt if enabled.

- [x] **Step 4: Run tests to verify all pass**

Run: `npx jest src/services/__tests__/notifications.test.ts`  
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/services/notifications.ts src/services/__tests__/notifications.test.ts
git commit -m "feat(reminders): implement notifications service and resync engine"
```

---

### Task 5: UI: Settings Screen Reminders Configuration

**Files:**
- Modify: `src/app/(tabs)/settings.tsx`

**Interfaces:**
- Consumes: `useSettings()`, `appActions().updateSettings`, `requestNotificationPermissionsAsync()`, `syncAllNotifications()`

- [x] **Step 1: Implement Reminders section in `src/app/(tabs)/settings.tsx`**

Replace the muted "Coming soon" card with:
1. Permission status badge / "Enable Notifications" button if permission is not granted.
2. Cadence reminder time chips (e.g., "09:00", "10:00", "12:00").
3. Birthday reminders switch toggle.
4. Daily gratitude prompt switch toggle + time chips ("19:00", "20:00", "21:00").
5. On setting change, call `appActions().updateSettings(...)` and trigger `syncAllNotifications(useAppStore.getState())`.

- [x] **Step 2: Verify typecheck & test**

Run: `npm test && npm run typecheck`  
Expected: PASS

- [x] **Step 3: Commit**

```bash
git add src/app/(tabs)/settings.tsx
git commit -m "feat(reminders): add full reminders configuration to settings screen"
```

---

### Task 6: UI: Friend Detail Snooze/Skip & Planned Reminders

**Files:**
- Modify: `src/app/friend/[id].tsx`

**Interfaces:**
- Consumes: `appActions().snoozeFriend`, `skipCycle`, `clearSnooze`, `setPlannedContact`

- [x] **Step 1: Add Snooze & Skip controls to `src/app/friend/[id].tsx`**

1. In Cadence card:
   - If friend is snoozed (`friend.snoozedUntil` in the future):
     - Display cozy badge: `"Snoozed until {formattedDate}"`
     - Provide button: `"Clear snooze"`
   - If friend has a cadence:
     - Provide a `"Snooze"` action menu with options:
       - Snooze 1 day (Tomorrow)
       - Snooze 3 days
       - Snooze 1 week
       - Skip cycle (+{interval} days)
2. In Planned Contact modal/flow:
   - When saving a planned contact, automatically request permission if needed and trigger notification sync.
   - When clearing a planned contact, remove notification.

- [x] **Step 2: Verify typecheck & test**

Run: `npm test && npm run typecheck`  
Expected: PASS

- [x] **Step 3: Commit**

```bash
git add src/app/friend/[id].tsx
git commit -m "feat(reminders): add snooze, skip, and planned contact notification triggers to friend detail"
```

---

### Task 7: Full Verification & App Hydration Notification Sync

**Files:**
- Modify: `src/app/_layout.tsx` (call `syncAllNotifications` on app mount once hydrated)
- Test: Full test suite

- [x] **Step 1: Hook up hydration sync in `src/app/_layout.tsx`**

When `hasHydrated` becomes true on native platforms, trigger `syncAllNotifications(store.getState())` in a background effect.

- [x] **Step 2: Run complete verification suite**

```bash
npm test
npm run typecheck
npx expo lint
npx expo export --platform web
```

- [x] **Step 3: Commit**

```bash
git add src/app/_layout.tsx
git commit -m "feat(reminders): trigger notification resync on app hydration and complete Phase 3"
```
