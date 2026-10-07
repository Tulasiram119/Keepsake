# Friend Connection & Gratitude App: Product and Technical Spec

A personal, offline-first mobile app to stay in touch with friends and remember what you're grateful for.

---

## 1. Product Summary

**Purpose:** Help you keep relationships alive on purpose, not by accident, and build a habit of noticing gratitude.

**Main question the app answers:** *"When did I last connect with this person, and why am I grateful for them?"*

**Principles**
- Fast to log (2 to 3 taps)
- Calm, warm, and never guilt-inducing
- Your data stays on your phone, and you can always take it with you (export/import)

---

## 2. Features

### 2.1 Friend Profiles
- Name, optional photo, birthday, how you met, notes
- Optional group/tag (close friends, family, college, work)
- Summary on each profile: last contact, next planned contact, latest gratitude note

### 2.2 Interaction Log
- Types: **Met**, **Called**, **Texted**, **Video call**
- Date (backdating allowed) and an optional short note
- Timeline of all interactions per friend
- Edit and delete entries

### 2.3 Planned Contact and Repeat Reminders
- Schedule a future call or meetup with a date and time
- **Repeat interval** per friend: 7, 14, 30 days, or custom
- Logging an interaction automatically resets the countdown
- Overdue friends are highlighted softly

### 2.4 Gratitude Journal
- **Friend gratitude:** "Grateful to Ravi for helping me move"
- **General gratitude:** a situation or moment in life, not tied to anyone
- Fields: text, date, optional category tag, linked friend(s) (zero, one, or many)

### 2.5 "How Long Has It Been?" Dashboard (Home)
- Friends sorted by longest time since last contact
- Each card shows: last contact ("Called 12 days ago"), latest gratitude note, next planned contact
- Quick actions: **Log**, **Call**, **Add gratitude**

### 2.6 Gratitude Timeline
- One feed for friend and general entries
- Filters: by friend, by date range, general only
- "Memory of the day": resurfaces a random older entry

### 2.7 Reminders
- Notification when a friend's repeat interval is due
- Notification for planned calls at the chosen time
- Snooze (tomorrow, 3 days, next week) and "skip this cycle"
- Optional daily gratitude prompt at a time you choose
- Optional birthday reminders

### 2.8 Data Export and Import
- **Export:** one tap creates a `.json` backup file, shared via the system share sheet (save to Files, Drive, email, WhatsApp, etc.)
- **Import:** pick a backup file, preview what it contains, then choose **Merge** or **Replace**
- Versioned file format so future app updates can still read old backups
- Optional CSV export for friends and interactions (for spreadsheets)

---

## 3. Tech Stack

| Area | Choice | Why |
|---|---|---|
| Framework | **Expo** (managed workflow, latest stable SDK) | Fast setup, easy builds, great device APIs |
| UI | **React Native** | One codebase for iOS and Android |
| Language | **TypeScript** (strict mode) | Safer data models and refactors |
| State | **Zustand** | Tiny, simple, no boilerplate |
| Local storage | **AsyncStorage** or **MMKV** via Zustand `persist` (see 3.1) | Offline-first, no backend needed |
| Navigation | **Expo Router** (file-based) | Standard for Expo, simple tabs and stacks |
| Notifications | **expo-notifications** | Local scheduled reminders, no server |
| Dates | **date-fns** | Lightweight "X days ago" and interval math |
| IDs | **expo-crypto** (`randomUUID`) | Stable unique IDs, important for import/merge |
| Export | **expo-file-system** + **expo-sharing** | Write a JSON file and open the share sheet |
| Import | **expo-document-picker** + **expo-file-system** | Pick and read a backup file |
| Contacts (later) | **expo-contacts** | Import friends from the phone |
| Validation | **zod** | Validates imported files before touching your data |
| Forms | **react-hook-form** (optional) | Smooth, simple forms |
| Icons | **@expo/vector-icons** | Bundled with Expo |

### 3.1 Storage: choosing between options

| Option | Best when | Notes |
|---|---|---|
| **AsyncStorage** | Starting simple, a few hundred records | Works in Expo Go, async, easiest |
| **MMKV** (`react-native-mmkv`) | You want speed and synchronous reads | Needs a development build (not Expo Go) |
| **expo-sqlite** | Thousands of entries or complex queries | More setup; more than this app likely needs |

**Recommendation:** Start with **AsyncStorage + Zustand persist**. It fits your stack, works in Expo Go, and a personal friend list will stay small. Wrap storage behind one small adapter file so you can switch to MMKV later without touching the rest of the app.

---

## 4. Data Model (TypeScript)

```ts
type ID = string; // UUID
type ISODate = string; // e.g. "2026-10-06T18:30:00.000Z"

interface Friend {
  id: ID;
  name: string;
  photoUri?: string;
  birthday?: string;          // "MM-DD" or "YYYY-MM-DD"
  howWeMet?: string;
  notes?: string;
  group?: string;
  repeatEveryDays?: number;   // undefined = no repeat reminder
  nextPlanned?: PlannedContact;
  createdAt: ISODate;
  updatedAt: ISODate;
  archived?: boolean;
}

interface PlannedContact {
  at: ISODate;
  type: InteractionType;
  notificationId?: string;    // for cancelling or rescheduling
}

type InteractionType = 'met' | 'called' | 'texted' | 'video';

interface Interaction {
  id: ID;
  friendId: ID;
  type: InteractionType;
  date: ISODate;
  note?: string;
  createdAt: ISODate;
}

interface GratitudeEntry {
  id: ID;
  text: string;
  date: ISODate;
  friendIds: ID[];            // empty array = general gratitude
  tag?: string;               // health, work, family, etc.
  createdAt: ISODate;
}

interface Settings {
  dailyPromptEnabled: boolean;
  dailyPromptTime: string;    // "20:00"
  birthdayRemindersEnabled: boolean;
  reminderTime: string;       // default time for due reminders
  theme: 'warm-light' | 'warm-dark' | 'system';
}
```

**Derived values (computed, not stored):** last contact date, days since last contact, overdue status, latest gratitude per friend. Computing them avoids stale data.

### Backup file format

```json
{
  "app": "friend-gratitude",
  "schemaVersion": 1,
  "exportedAt": "2026-10-06T12:00:00.000Z",
  "data": {
    "friends": [],
    "interactions": [],
    "gratitude": [],
    "settings": {}
  }
}
```

---

## 5. State Management (Zustand)

Suggested stores, each persisted:

- `useFriendsStore`: add/update/archive friends, set repeat interval, set planned contact
- `useInteractionsStore`: log, edit, delete interactions
- `useGratitudeStore`: add, edit, delete entries; random memory picker
- `useSettingsStore`: preferences and theme

**Selectors worth writing early**
- `selectFriendsByOverdue()`: powers the dashboard
- `selectLastInteraction(friendId)`
- `selectGratitudeForFriend(friendId)`
- `selectGeneralGratitude()`

**Persist tips**
- Use `persist` with a `version` and a `migrate` function from day one
- Add a `hasHydrated` flag and show a splash or skeleton until storage has loaded, to avoid UI flicker

---

## 6. Reminder Logic (expo-notifications)

All reminders are **local notifications**, so no server is needed.

1. When an interaction is logged, cancel the friend's existing due-reminder and schedule a new one for `lastContact + repeatEveryDays`.
2. Planned contacts get their own notification at the chosen time; store the returned `notificationId` on the friend.
3. Snooze cancels and reschedules for the new time. "Skip cycle" pushes the due date forward by one interval.
4. The daily gratitude prompt is a single repeating daily trigger.

**Things to know**
- Request notification permission at a friendly moment (e.g., when the first reminder is set), not on first launch.
- iOS allows only about 64 pending local notifications. With a small friend list this is fine; if it grows, schedule only the next ~30 days and refresh on app open.
- On Android 13+, notification permission is runtime-granted; create a notification channel on startup.
- Exact-time alarms on newer Android versions can need extra permission. "Around that time" is usually good enough for this use case.
- Re-sync all scheduled notifications after importing a backup.

---

## 7. Export and Import: Detailed Behavior

### Export
1. Read all stores and build the backup object.
2. Write to `FileSystem.cacheDirectory + "friend-gratitude-backup-YYYY-MM-DD.json"`.
3. Open the share sheet with `expo-sharing`.
4. Show "Last backup: 3 days ago" in Settings, and optionally nudge once a month.

### Import
1. User picks a `.json` file with `expo-document-picker`.
2. Parse and **validate with zod**; reject with a clear message if invalid.
3. If `schemaVersion` is older, run it through migration functions.
4. Show a preview: "42 friends, 310 interactions, 128 gratitude entries".
5. User chooses:
   - **Merge:** add items with new IDs; for matching IDs keep the one with the newer `updatedAt`
   - **Replace:** wipe current data (ask for confirmation, and offer to export a safety backup first)
6. Reschedule all notifications.

### Safety rules
- Never apply an import until validation passes
- Never delete existing data before the new data is confirmed valid
- Keep backups human-readable (pretty-printed JSON)

---

## 8. Design: Warm and Easy on the Eyes

**Feel:** soft, cozy, journal-like. Low contrast glare, generous spacing, rounded corners.

### Light theme palette (warm paper)

| Role | Color | Hex |
|---|---|---|
| Background | Warm cream | `#FBF6EE` |
| Surface / cards | Soft ivory | `#FFFBF5` |
| Primary | Terracotta | `#C8553D` |
| Secondary | Muted amber | `#E0A458` |
| Accent (gratitude) | Dusty rose | `#D98880` |
| Success | Sage green | `#8FA67A` |
| Text primary | Warm brown-charcoal | `#3B2F2A` |
| Text secondary | Soft taupe | `#7A6A60` |
| Borders | Sand | `#E8DCCB` |

### Dark theme palette (warm night)

| Role | Color | Hex |
|---|---|---|
| Background | Deep cocoa | `#1F1814` |
| Surface / cards | Dark umber | `#2A211C` |
| Primary | Soft coral | `#E07A5F` |
| Secondary | Honey | `#E9B872` |
| Accent (gratitude) | Muted rose | `#D9958F` |
| Text primary | Warm off-white | `#F2E8DC` |
| Text secondary | Muted tan | `#B5A495` |

### UI guidelines
- Avoid pure white and pure black; use the warm tones above
- Body text at least 16 px; tap targets at least 44 px
- Overdue state uses amber or soft coral, not harsh red
- Friendly copy: "It's been a while since you spoke with Ravi" instead of "OVERDUE"
- Support system light/dark mode automatically
- Keep text contrast at WCAG AA or better; check the secondary text colors

Define colors in one `theme.ts` file with a `useTheme()` hook so the whole app can switch themes easily.

---

## 9. Screens and Navigation

**Bottom tabs**
1. **Home**: "How long has it been?" dashboard
2. **Friends**: all friends, search, groups
3. **Gratitude**: timeline and filters
4. **Settings**: reminders, theme, export/import

**Stack screens**
- Friend detail (timeline, gratitude, plan next contact)
- Add/edit friend
- Log interaction (modal, quick)
- Add gratitude (modal, quick, with "link friends" picker)
- Import preview

**Floating "+" button** on Home and Gratitude for the fastest logging path.

---

## 10. Suggested Project Structure

```
app/                      # Expo Router screens
  (tabs)/
    index.tsx             # Home dashboard
    friends.tsx
    gratitude.tsx
    settings.tsx
  friend/[id].tsx
  log-interaction.tsx
  add-gratitude.tsx
  import-preview.tsx
src/
  components/             # FriendCard, GratitudeCard, EmptyState, etc.
  store/                  # friends.ts, interactions.ts, gratitude.ts, settings.ts
  storage/                # storage adapter (AsyncStorage now, MMKV later)
  services/
    notifications.ts      # schedule, cancel, resync
    backup.ts             # export, import, validate, migrate
  theme/                  # colors, spacing, typography, useTheme
  utils/                  # date helpers, selectors
  types/                  # shared TypeScript types
```

---

## 11. Build Roadmap

### Phase 1: Foundation
- Expo + TypeScript project, Expo Router, theme, storage adapter
- Zustand stores with persistence and hydration handling

### Phase 2: Core features (MVP)
- Friend CRUD, interaction log, gratitude entries
- Home dashboard with "last contact" and latest gratitude
- Repeat interval logic

### Phase 3: Reminders
- Notification permissions, scheduling, snooze, skip
- Planned contacts

### Phase 4: Data safety
- Export and import with validation, merge/replace, migrations
- Backup reminder in Settings

### Phase 5: Polish
- Dark theme, empty states, haptics, small animations
- Random "memory of the day", daily gratitude prompt

### Later ideas
- Import from phone contacts
- Home-screen widget
- Weekly or monthly summary ("You connected with 6 friends this month")
- Optional encrypted cloud backup
- App lock (biometrics) since the content is personal

---

## 12. Risks and Notes

- **No cloud means no automatic backup.** If the phone is lost, data is lost unless exported. Make export prominent and nudge periodically.
- **Notifications are local.** If the user force-stops the app or reinstalls, resync schedules on next open.
- **Expo Go limits:** AsyncStorage and notifications work in Expo Go for basic testing, but for reliable notification behavior and MMKV, use a **development build** (EAS Build).
- **Schema changes:** version both the Zustand persist store and the backup file from the start.
- **Photos:** store only the URI in data; photos are not included in JSON backups. Decide later whether to support a zip export with images.

---

## 13. Open Decisions

1. Should friend photos be part of backups (larger files) or skipped in v1?
2. Single-tap "Call" button that opens the phone dialer (needs a stored phone number), or log-only?
3. Is the daily gratitude prompt on by default, or opt-in?
4. Should deleting a friend also delete their linked gratitude entries, or keep them as general gratitude?
