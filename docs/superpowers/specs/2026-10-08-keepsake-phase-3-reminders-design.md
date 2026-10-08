# Keepsake Phase 3: Reminders & Notifications Design Spec

**Date:** 2026-10-08  
**Status:** Approved  
**Source:** [plan.md](../../../plan.md) (§2.3, §2.7, §6)

---

## 1. Objective

Implement Phase 3 of the Keepsake product plan: a local, privacy-first notification subsystem powering stay-in-touch cadence reminders, planned contact alerts, snooze/skip controls, birthday greetings, and an optional daily gratitude reflection prompt.

---

## 2. Core Requirements

1. **Cadence Due-Reminders:**
   - When a friend has `repeatEveryDays` configured, calculate the next due date based on their last interaction date (or friend creation date if no interactions yet).
   - Fire a local reminder on that day at `settings.reminderTime` (default `10:00 AM`).
   - Copy: `"It's been a while since you spoke with {name}."`
2. **Planned Contact Alerts:**
   - When a future interaction is scheduled (`friend.nextPlanned`), schedule a local notification at that exact target time.
   - Store the scheduled `notificationId` on `friend.nextPlanned.notificationId`.
   - Copy: `"Planned {type} with {name} coming up."`
3. **Snooze & Skip Controls:**
   - Allow snoozing due reminders for 1 day, 3 days, or 7 days, or skipping the current cycle (adding 1 interval).
   - Logging any new moment for the friend immediately resets any active snooze.
   - Snoozed friends are suppressed from the overdue section on the Home dashboard while the snooze is active.
4. **Birthday Reminders:**
   - Enabled by default (`settings.birthdayRemindersEnabled = true`).
   - If a friend has a valid birthday (`MM-DD` or `YYYY-MM-DD`), schedule a reminder for 9:00 AM on their upcoming birthday.
   - Copy: `"Today is {name}'s birthday! 🎂"`
5. **Daily Gratitude Reflection:**
   - Opt-in (`settings.dailyPromptEnabled = false` by default).
   - If enabled, schedule a repeating daily prompt at `settings.dailyPromptTime` (default `20:00` / 8:00 PM).
   - Copy: `"A moment of gratitude 🌿 What is one thing you're thankful for today?"`
6. **Platform Safety:**
   - Safe execution across Web, iOS, Android, and Jest test environments without crashes or unmet dependencies.

---

## 3. Architecture & Components

### 3.1 Dependencies
Install using `npx expo install`:
- `expo-notifications`

### 3.2 Notification Service (`src/services/notifications.ts`)
Encapsulates all interaction with `expo-notifications`:
- **Foreground Notification Handler:** Configured at app initialization (`shouldShowAlert: true`, `shouldPlaySound: true`, `shouldSetBadge: false`).
- **Notification Channel (Android):** Sets up default channel `keepsake-reminders` with `AndroidImportance.HIGH` and vibration.
- **Permission Management:** `requestNotificationPermissionsAsync()` requests permissions gracefully when a user enables reminders or schedules a contact.
- **Central Resync Engine:** `syncAllNotifications(state: AppState, now: Date = new Date())`:
  1. Cancels pending cadence, birthday, and daily prompt notifications.
  2. Traverses active friends with `repeatEveryDays`:
     - Checks `snoozedUntil`; if snoozed in the future, target date is `snoozedUntil`.
     - Otherwise target date is `lastContact + repeatEveryDays` at `reminderTime`.
     - If target date > `now`, schedules local notification.
  3. Traverses active friends with `nextPlanned`:
     - If `nextPlanned.at` > `now`, schedules local notification and stores/verifies `notificationId`.
  4. If `birthdayRemindersEnabled`:
     - Calculates next birthday occurrence for friends with valid birthdays at 9:00 AM; schedules local notification.
  5. If `dailyPromptEnabled`:
     - Schedules daily repeating notification at `dailyPromptTime`.
  6. Respects the OS limit (capping at next ~50 upcoming events, easily refreshing on store updates/app open).

### 3.3 Data Models (`src/types/models.ts`)
Extend `Friend` and `Settings`:
```ts
export interface Friend {
  // Existing fields...
  snoozedUntil?: ISODate; // If snoozed, ISO timestamp
}

export interface Settings {
  theme: ThemePreference;
  reminderTime: string; // e.g. "10:00"
  dailyPromptEnabled: boolean; // default false
  dailyPromptTime: string; // e.g. "20:00"
  birthdayRemindersEnabled: boolean; // default true
}
```

### 3.4 Store Actions (`src/store/friends-slice.ts`, `settings-slice.ts`, `hooks.ts`)
- `snoozeFriend(id: ID, days: number)`: Updates `friend.snoozedUntil = addDays(now, days).toISOString()`.
- `skipCycle(id: ID)`: Advances cadence due date by `friend.repeatEveryDays` into `friend.snoozedUntil`.
- `clearSnooze(id: ID)`: Removes `snoozedUntil`.
- `logInteraction` resets `snoozedUntil` automatically.
- Store subscriber or action wrapper calls `syncAllNotifications()` to keep OS notifications in sync with state.

### 3.5 UI & Screens

#### Settings Screen (`src/app/(tabs)/settings.tsx`)
- Permission status banner with "Enable Reminders" if permissions are undetermined/denied.
- Cadence reminders time selector (e.g. 10:00 AM).
- Birthday reminders toggle (on/off).
- Daily gratitude prompt toggle (on/off) and time selector (default 20:00).

#### Friend Detail Screen (`src/app/friend/[id].tsx`)
- In Cadence section:
  - If snoozed: displays "Snoozed until {date}" pill with "Clear snooze" button.
  - If overdue or due: offers "Snooze" action menu (1 day, 3 days, 1 week, Skip cycle).
- In Planned Contact section:
  - Schedules notification when planned contact is added/updated.
  - Clears notification when planned contact is deleted.

#### Home Dashboard Screen (`src/app/(tabs)/index.tsx`)
- Derived `computeCadenceStatus` respects `snoozedUntil`, ensuring snoozed friends are not marked overdue.

---

## 4. Testing Strategy

1. **Unit Tests (`src/services/__tests__/notifications.test.ts`):**
   - Mock `expo-notifications`.
   - Test `syncAllNotifications` schedules cadence reminder for overdue/due friend at correct time.
   - Test snooze suppresses immediate due reminder and schedules for `snoozedUntil`.
   - Test birthday reminder calculation for upcoming dates.
   - Test daily prompt scheduling when enabled, cancellation when disabled.
2. **Store Tests (`src/store/__tests__/store.test.ts`):**
   - Test `snoozeFriend`, `skipCycle`, and `clearSnooze` slice actions.
   - Test `logInteraction` resets `snoozedUntil`.
3. **Derived Tests (`src/utils/__tests__/derived.test.ts`):**
   - Test `computeCadenceStatus` and dashboard ordering with `snoozedUntil`.
4. **End-to-End Verification:**
   - Type check (`npm run typecheck`).
   - Unit tests (`npm test`).
   - Linter (`npx expo lint`).
   - Web export (`npx expo export --platform web`).
