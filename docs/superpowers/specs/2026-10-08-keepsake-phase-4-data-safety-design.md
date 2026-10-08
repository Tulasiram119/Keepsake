# Keepsake Phase 4: Data Safety (Export, Import & Backup) Design Spec

**Date:** 2026-10-08  
**Status:** Approved  
**Source:** [plan.md](../../../plan.md) (§2.8, §4, §7, §9, §11)

---

## 1. Objective

Implement Phase 4 of the Keepsake product plan: an offline-first, privacy-focused data safety subsystem that enables users to export their complete friendship timeline, moments, and gratitude journals to shareable, human-readable JSON files, and import backups safely with rigorous schema validation, non-destructive merging, clean-slate replacement, and automatic notification resynchronization.

---

## 2. Core Requirements

1. **JSON Backup Export:**
   - Serializes entire local dataset: friends, interactions, gratitude entries, and app settings into a versioned, pretty-printed JSON structure.
   - Profile photo references are preserved as local URIs in JSON metadata (binary bundling skipped in v1 for lightweight, fast backups).
   - Writes the file to the local cache directory: `friend-gratitude-backup-YYYY-MM-DD.json`.
   - Opens the platform native share sheet (`expo-sharing`) allowing users to save to Files, Google Drive, email, messaging apps, etc.
   - Updates `settings.lastBackupAt` to the current ISO timestamp upon export.

2. **JSON Backup Import & Validation:**
   - Lets users select a `.json` backup file using `expo-document-picker`.
   - Validates file structure using `zod` before any data is ingested or modified.
   - Supports schema version migrations (`schemaVersion: 1` baseline, forward-extensible).
   - Catches corrupted or invalid files early, preventing crashes or invalid store states.

3. **Dedicated Import Preview Screen (`/import-preview`):**
   - Displays incoming backup metadata: export timestamp and record counts.
   - Compares incoming records against current device records (Friends, Moments, Gratitude Notes).
   - Offers two resolution modes:
     - **Merge:** Deduplicates by ID. For matching IDs, the record with the newer `updatedAt` wins; new IDs are appended.
     - **Replace:** Wipes current data and hydrates the backup data, with an explicit confirmation dialog and option to export a safety backup first.
   - Provides a **Cancel** option to discard staged data without making changes.

4. **Notification Resynchronization:**
   - After any successful import (`merge` or `replace`), automatically executes `syncAllNotifications(state)` to refresh all scheduled reminders, cadence alerts, planned contacts, and birthday notifications.

5. **Settings Backup Dashboard:**
   - Upgrades the "Your Data" card in Settings:
     - Replaces placeholder UI with active "Export Backup" and "Import Backup" actions.
     - Displays humanized backup status: `"Last backup: X days ago"` or `"No backups created yet"`.
     - Displays a gentle reminder notice if the user has not backed up in over 30 days.

6. **Cross-Platform & Offline Safety:**
   - Fully resilient on iOS, Android, and Web platforms.
   - Comprehensive unit test coverage for validation, schema migrations, and store merge/replace actions.

---

## 3. Architecture & Components

### 3.1 Dependencies
Install via `npx expo install`:
- `expo-file-system` (~57.0.x SDK compatible)
- `expo-sharing` (~57.0.x SDK compatible)
- `expo-document-picker` (~57.0.x SDK compatible)
- `zod` (runtime schema validation)

### 3.2 Data Models & Schema (`src/types/models.ts` & `src/services/backup-schema.ts`)

#### Model Extension
```ts
export interface Settings {
  dailyPromptEnabled: boolean;
  dailyPromptTime: string;
  birthdayRemindersEnabled: boolean;
  reminderTime: string;
  theme: ThemePreference;
  lastBackupAt?: ISODate;
}
```

#### Backup Envelope Interface
```ts
export interface BackupFile {
  app: 'friend-gratitude';
  schemaVersion: number;
  exportedAt: ISODate;
  data: {
    friends: Friend[];
    interactions: Interaction[];
    gratitude: GratitudeEntry[];
    settings?: Partial<Settings>;
  };
}
```

#### Zod Schemas (`src/services/backup-schema.ts`)
```ts
import { z } from 'zod';

export const CURRENT_BACKUP_SCHEMA_VERSION = 1;

export const friendSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  photoUri: z.string().optional(),
  phone: z.string().optional(),
  birthday: z.string().optional(),
  howWeMet: z.string().optional(),
  notes: z.string().optional(),
  group: z.string().optional(),
  repeatEveryDays: z.number().int().positive().optional(),
  nextPlanned: z.object({
    at: z.string(),
    type: z.enum(['met', 'called', 'texted', 'video']),
    notificationId: z.string().optional(),
  }).optional(),
  snoozedUntil: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archived: z.boolean().optional(),
});

export const interactionSchema = z.object({
  id: z.string().min(1),
  friendId: z.string().min(1),
  type: z.enum(['met', 'called', 'texted', 'video']),
  date: z.string(),
  note: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const gratitudeEntrySchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  date: z.string(),
  friendIds: z.array(z.string()),
  tag: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const backupFileSchema = z.object({
  app: z.literal('friend-gratitude'),
  schemaVersion: z.number().int().min(1),
  exportedAt: z.string(),
  data: z.object({
    friends: z.array(friendSchema),
    interactions: z.array(interactionSchema),
    gratitude: z.array(gratitudeEntrySchema),
    settings: z.record(z.unknown()).optional(),
  }),
});
```

### 3.3 Backup Service (`src/services/backup.ts`)
Centralizes file export, document picking, serialization, validation, and staging:

1. **`exportBackupAsync(): Promise<{ success: boolean; filePath?: string; error?: string }>`**
   - Retrieves full current state via `useAppStore.getState()`.
   - Generates pretty-printed JSON string conforming to `BackupFile`.
   - Writes to `${FileSystem.cacheDirectory}friend-gratitude-backup-${format(now, 'yyyy-MM-dd')}.json`.
   - Opens share sheet via `Sharing.shareAsync(...)`.
   - On completion, updates store: `appActions().updateSettings({ lastBackupAt: new Date().toISOString() })`.

2. **`pickAndValidateBackupAsync(): Promise<PickBackupResult>`**
   - Launches `DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true })`.
   - If canceled, returns `{ status: 'cancelled' }`.
   - Reads file using `FileSystem.readAsStringAsync(asset.uri)`.
   - Parses JSON; runs schema migration runner if `schemaVersion < CURRENT_BACKUP_SCHEMA_VERSION`.
   - Validates via `backupFileSchema.safeParse(...)`.
   - If validation fails, returns `{ status: 'error', message: friendlyErrorMessage }`.
   - If valid, stores payload into memory via `stageBackup(backup)` and returns `{ status: 'success', backup }`.

3. **Staging Store / State Container:**
   - In-memory holder: `stageBackup(backup: BackupFile)` and `getStagedBackup(): BackupFile | null`, `clearStagedBackup(): void`.
   - Prevents passing huge JSON payloads through URL query parameters.

### 3.4 Store Actions (`src/store/index.ts` / slices)
Adds atomic `importBackup` action:
```ts
export type ImportMode = 'merge' | 'replace';

export interface ImportSummary {
  friendsAdded: number;
  friendsUpdated: number;
  interactionsAdded: number;
  interactionsUpdated: number;
  gratitudeAdded: number;
  gratitudeUpdated: number;
}
```

- **`replace` Implementation:**
  - `state.friends = backup.data.friends`
  - `state.interactions = backup.data.interactions`
  - `state.gratitudeList = backup.data.gratitude`
  - Preserves local device preferences (theme, notification prompt state) while recording `lastBackupAt: new Date().toISOString()`.
- **`merge` Implementation:**
  - Friends map indexed by `id`. For conflicting IDs, the one with `item.updatedAt > existing.updatedAt` replaces the item. Unique IDs appended.
  - Interactions map indexed by `id`. Same resolution.
  - Gratitude entries indexed by `id`. Same resolution.
  - Returns counts of added and updated records.

---

## 4. UI & Screen Specifications

### 4.1 Settings Screen (`src/app/(tabs)/settings.tsx`)
- **"Your Data" Card:**
  - Header: "Your Data" with a "Private & offline" badge.
  - Description: "Your memories are stored locally on your device. Export a backup to keep your records safe or restore them on another device."
  - **Backup Recency Pill / Status:**
    - `"Last backup: Today"` / `"Last backup: 3 days ago"`
    - If `!lastBackupAt`: `"No backup saved yet"`
    - If `lastBackupAt` is >30 days ago (or absent with >0 items): gentle warm amber badge: *"It's been a while since your last backup. We recommend exporting a copy to keep your data safe."*
  - **Action Row:**
    - `Button` **Export Backup**: triggers `exportBackupAsync()`, with loading indicator.
    - `Button` **Import Backup**: triggers `pickAndValidateBackupAsync()`; on success, pushes to `/import-preview`.
  - **Data Counts Display:**
    - Displays current numbers: `X friends · Y moments · Z gratitude notes`.

### 4.2 Import Preview Screen (`src/app/import-preview.tsx`)
- Modal presentation (`presentation: 'modal'` in `_layout.tsx`).
- **Header:**
  - Title: "Restore Backup"
  - Subtitle: "Review records before importing"
- **Backup Information Card:**
  - Exported date: formatted nicely (e.g., "October 6, 2026 at 5:30 PM").
  - Breakdown table / chips showing incoming records:
    - Friends: `14 incoming` (e.g. `3 new, 1 updated`)
    - Moments: `42 incoming`
    - Gratitude notes: `19 incoming`
- **Resolution Options:**
  - **Merge with Existing Data (Recommended):**
    - Button variant: `primary`.
    - Description: "Combines backup records with your current data. Keeps any changes made since."
  - **Replace All Data:**
    - Button variant: `outline`.
    - Description: "Overwrites current friends, moments, and gratitude entries with this backup."
    - Tapping triggers an `Alert.alert` safety confirmation: *"Replace all data? This cannot be undone. Consider exporting a backup of your current data first."* with options `Export Safety Backup`, `Proceed with Replace`, `Cancel`.
  - **Cancel:**
    - Discards staged backup and dismisses modal.
- **Completion Flow:**
  - Triggers `importBackup(stagedBackup, mode)`.
  - Clears staged backup.
  - Calls `syncAllNotifications(useAppStore.getState())`.
  - Shows success toast / alert (`"Imported successfully! 3 friends added, 1 updated."`).
  - Navigates back to Settings.

---

## 5. Error Handling & Edge Cases

1. **User Cancels Picker:**
   - Graceful return, no error banner or UI glitch.
2. **Non-JSON or Corrupted File:**
   - `pickAndValidateBackupAsync` catches parsing errors and shows an alert: *"The selected file is not a valid JSON document."*
3. **Foreign or Unsupported Schema:**
   - Zod validation fails; alerts: *"This file does not match Keepsake's backup format."*
4. **Older Schema Versions:**
   - Migration pipeline verifies `schemaVersion`. Currently `schemaVersion: 1`. Future versions pass through sequential transforms.
5. **No Existing Data During Replace:**
   - Handled seamlessly without error.
6. **Web Platform:**
   - Safe guards for `expo-sharing` and `expo-file-system` to prevent runtime crashes when running in web mode.

---

## 6. Testing Strategy

1. **Schema & Migration Tests (`src/services/__tests__/backup-schema.test.ts`):**
   - Ingests valid `BackupFile` and asserts schema passes.
   - Ingests missing required fields (e.g. missing friend `id` or `name`) and asserts Zod rejects with descriptive issues.
   - Rejects non-matching `app` tag (e.g., `app: 'some-other-app'`).
   - Verifies migration runner returns transformed schema version.

2. **Store Import Tests (`src/store/__tests__/import.test.ts`):**
   - Tests `merge` mode:
     - New friend IDs are added.
     - Conflicting friend ID with newer `updatedAt` updates the record.
     - Conflicting friend ID with older `updatedAt` is ignored.
     - Same logic verified for `interactions` and `gratitudeList`.
   - Tests `replace` mode:
     - Clears existing friends, interactions, and gratitude; installs incoming records exactly.
   - Verifies `lastBackupAt` is updated.

3. **Notification Resync Integration:**
   - Asserts `syncAllNotifications` is invoked after both `merge` and `replace` operations.
