# Keepsake Phase 4: Data Safety (Export, Import & Backup) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full offline JSON backup export, schema-validated import with migration support, dedicated import preview screen with Merge/Replace resolution, automatic notification resynchronization, and Settings backup health monitoring.

**Architecture:** A dedicated backup service (`src/services/backup.ts`) and schema validator (`src/services/backup-schema.ts`) powered by `zod`, `expo-file-system`, `expo-sharing`, and `expo-document-picker`. An in-memory staging mechanism holds validated payloads prior to user resolution. Store actions in Zustand provide atomic merge/replace state transitions and invoke `syncAllNotifications()`. The UI provides an interactive review modal (`src/app/import-preview.tsx`) and enhanced Settings card.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript 6 (strict), Zustand 5, `zod` 3, `expo-file-system`, `expo-sharing`, `expo-document-picker`, `date-fns` 4, `jest-expo`.

**Spec:** `docs/superpowers/specs/2026-10-08-keepsake-phase-4-data-safety-design.md`

## Global Constraints

- Install packages via `npx expo install <pkg>` (never raw `npm install`).
- TypeScript `strict: true`; no `any`.
- Keep Web, Jest, and native environments safe using platform guards and mocks.
- Copy must remain calm, warm, and guilt-free.
- Profile photos in v1 store URI strings only in JSON; binary bundling is skipped.
- Never apply an import until validation passes.
- Derived values remain computed from explicit `now` timestamps.

---

### Task 1: Package Installation, Jest Mocks & Model Extensions

**Files:**
- Modify: `package.json`
- Modify: `jest.setup.ts`
- Modify: `src/types/models.ts`
- Modify: `src/store/defaults.ts`

**Interfaces:**
- Produces: `Settings.lastBackupAt?: ISODate`
- Produces: Mocks for `expo-file-system`, `expo-sharing`, `expo-document-picker` in `jest.setup.ts`

- [ ] **Step 1: Install `expo-file-system`, `expo-sharing`, `expo-document-picker`, and `zod`**

```bash
npx expo install expo-file-system expo-sharing expo-document-picker zod
```

- [ ] **Step 2: Add Jest mocks for new Expo modules in `jest.setup.ts`**

Add mocks for `expo-file-system`, `expo-sharing`, and `expo-document-picker` to `jest.setup.ts`:

```ts
jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///test-cache/',
  documentDirectory: 'file:///test-docs/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue('{}'),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, isDirectory: false, size: 1024 }),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));
```

- [ ] **Step 3: Extend `Settings` in `src/types/models.ts`**

Update `Settings` in `src/types/models.ts`:
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

- [ ] **Step 4: Update `DEFAULT_SETTINGS` in `src/store/defaults.ts`**

Update `DEFAULT_SETTINGS` in `src/store/defaults.ts`:
```ts
export const DEFAULT_SETTINGS: Settings = {
  dailyPromptEnabled: false,
  dailyPromptTime: '20:00',
  birthdayRemindersEnabled: true,
  reminderTime: '10:00',
  theme: 'warm-light',
  lastBackupAt: undefined,
};
```

- [ ] **Step 5: Run existing tests to verify zero regressions**

Run: `npm test && npm run typecheck`
Expected: PASS (all suites passing)

- [ ] **Step 6: Commit changes**

```bash
git add package.json package-lock.json jest.setup.ts src/types/models.ts src/store/defaults.ts
git commit -m "feat(backup): install packages, configure jest mocks, and add lastBackupAt setting"
```

---

### Task 2: Backup Zod Schema & Migration Engine

**Files:**
- Create: `src/services/backup-schema.ts`
- Create: `src/services/__tests__/backup-schema.test.ts`

**Interfaces:**
- Produces: `CURRENT_BACKUP_SCHEMA_VERSION = 1`
- Produces: `backupFileSchema` (Zod schema)
- Produces: `BackupFile` type
- Produces: `validateAndMigrateBackup(raw: unknown): { success: true; data: BackupFile } | { success: false; error: string }`

- [ ] **Step 1: Write failing test suite for backup schema and migrations**

Create `src/services/__tests__/backup-schema.test.ts`:
```ts
import {
  CURRENT_BACKUP_SCHEMA_VERSION,
  validateAndMigrateBackup,
} from '../backup-schema';

describe('Backup Schema & Migration Engine', () => {
  const validBackup = {
    app: 'friend-gratitude',
    schemaVersion: 1,
    exportedAt: '2026-10-08T12:00:00.000Z',
    data: {
      friends: [
        {
          id: 'friend-1',
          name: 'Sarah Connor',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
      interactions: [
        {
          id: 'interaction-1',
          friendId: 'friend-1',
          type: 'called',
          date: '2026-01-02T10:00:00.000Z',
          createdAt: '2026-01-02T10:00:00.000Z',
          updatedAt: '2026-01-02T10:00:00.000Z',
        },
      ],
      gratitude: [
        {
          id: 'gratitude-1',
          text: 'Grateful for good coffee',
          date: '2026-01-02T10:00:00.000Z',
          friendIds: ['friend-1'],
          createdAt: '2026-01-02T10:00:00.000Z',
          updatedAt: '2026-01-02T10:00:00.000Z',
        },
      ],
      settings: {
        theme: 'warm-light',
      },
    },
  };

  it('validates a valid v1 backup successfully', () => {
    const result = validateAndMigrateBackup(validBackup);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.app).toBe('friend-gratitude');
      expect(result.data.schemaVersion).toBe(CURRENT_BACKUP_SCHEMA_VERSION);
      expect(result.data.data.friends).toHaveLength(1);
    }
  });

  it('rejects an invalid app identifier', () => {
    const invalid = { ...validBackup, app: 'wrong-app' };
    const result = validateAndMigrateBackup(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/unrecognized/i);
    }
  });

  it('rejects missing friends array', () => {
    const invalid = {
      ...validBackup,
      data: { ...validBackup.data, friends: null },
    };
    const result = validateAndMigrateBackup(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it('rejects invalid friend model missing required fields', () => {
    const invalid = {
      ...validBackup,
      data: {
        ...validBackup.data,
        friends: [{ id: 'f1' /* missing name, createdAt, updatedAt */ }],
      },
    };
    const result = validateAndMigrateBackup(invalid);
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/services/__tests__/backup-schema.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `src/services/backup-schema.ts`**

Write `src/services/backup-schema.ts`:
```ts
import { z } from 'zod';
import type { Friend, GratitudeEntry, Interaction, Settings } from '@/types/models';

export const CURRENT_BACKUP_SCHEMA_VERSION = 1;

export const friendBackupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  photoUri: z.string().optional(),
  phone: z.string().optional(),
  birthday: z.string().optional(),
  howWeMet: z.string().optional(),
  notes: z.string().optional(),
  group: z.string().optional(),
  repeatEveryDays: z.number().int().positive().optional(),
  nextPlanned: z
    .object({
      at: z.string(),
      type: z.enum(['met', 'called', 'texted', 'video']),
      notificationId: z.string().optional(),
    })
    .optional(),
  snoozedUntil: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archived: z.boolean().optional(),
});

export const interactionBackupSchema = z.object({
  id: z.string().min(1),
  friendId: z.string().min(1),
  type: z.enum(['met', 'called', 'texted', 'video']),
  date: z.string(),
  note: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const gratitudeBackupSchema = z.object({
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
    friends: z.array(friendBackupSchema),
    interactions: z.array(interactionBackupSchema),
    gratitude: z.array(gratitudeBackupSchema),
    settings: z.record(z.string(), z.unknown()).optional(),
  }),
});

export type BackupFile = {
  app: 'friend-gratitude';
  schemaVersion: number;
  exportedAt: string;
  data: {
    friends: Friend[];
    interactions: Interaction[];
    gratitude: GratitudeEntry[];
    settings?: Partial<Settings>;
  };
};

export type ValidateBackupResult =
  | { success: true; data: BackupFile }
  | { success: false; error: string };

export function validateAndMigrateBackup(raw: unknown): ValidateBackupResult {
  if (typeof raw !== 'object' || raw === null) {
    return { success: false, error: 'Backup content must be a valid JSON object.' };
  }

  const base = raw as Record<string, unknown>;
  if (base.app !== 'friend-gratitude') {
    return {
      success: false,
      error: 'Unrecognized backup format. File is not a Keepsake backup.',
    };
  }

  const parsed = backupFileSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const field = firstIssue ? firstIssue.path.join('.') : 'unknown field';
    const msg = firstIssue ? firstIssue.message : 'Invalid structure';
    return {
      success: false,
      error: `Invalid backup data at "${field}": ${msg}`,
    };
  }

  return {
    success: true,
    data: parsed.data as unknown as BackupFile,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/services/__tests__/backup-schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/services/backup-schema.ts src/services/__tests__/backup-schema.test.ts
git commit -m "feat(backup): add zod schema validation and migration engine for backups"
```

---

### Task 3: Store Import & State Merge/Replace Actions

**Files:**
- Modify: `src/store/index.ts`
- Modify: `src/store/types.ts`
- Create: `src/store/__tests__/import.test.ts`

**Interfaces:**
- Produces: `useAppStore.getState().importBackup(backup: BackupFile, mode: 'merge' | 'replace'): ImportSummary`
- Produces: `ImportSummary` interface

- [ ] **Step 1: Write failing test suite for `importBackup` in `src/store/__tests__/import.test.ts`**

Create `src/store/__tests__/import.test.ts`:
```ts
import { useAppStore } from '../index';
import type { BackupFile } from '@/services/backup-schema';

describe('Store Backup Import Actions', () => {
  beforeEach(() => {
    useAppStore.setState({
      friends: [
        {
          id: 'friend-1',
          name: 'Sarah Connor (Original)',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      interactions: [],
      gratitudeList: [],
    });
  });

  const mockBackup: BackupFile = {
    app: 'friend-gratitude',
    schemaVersion: 1,
    exportedAt: '2026-10-08T12:00:00.000Z',
    data: {
      friends: [
        {
          id: 'friend-1',
          name: 'Sarah Connor (Updated)',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-05T00:00:00.000Z', // newer
        },
        {
          id: 'friend-2',
          name: 'John Connor',
          createdAt: '2026-01-03T00:00:00.000Z',
          updatedAt: '2026-01-03T00:00:00.000Z',
        },
      ],
      interactions: [
        {
          id: 'interaction-1',
          friendId: 'friend-1',
          type: 'called',
          date: '2026-01-02T10:00:00.000Z',
          createdAt: '2026-01-02T10:00:00.000Z',
          updatedAt: '2026-01-02T10:00:00.000Z',
        },
      ],
      gratitude: [
        {
          id: 'gratitude-1',
          text: 'Grateful for friendship',
          date: '2026-01-02T10:00:00.000Z',
          friendIds: ['friend-1'],
          createdAt: '2026-01-02T10:00:00.000Z',
          updatedAt: '2026-01-02T10:00:00.000Z',
        },
      ],
    },
  };

  it('merges new friends and updates newer duplicates', () => {
    const summary = useAppStore.getState().importBackup(mockBackup, 'merge');

    expect(summary.friendsAdded).toBe(1);
    expect(summary.friendsUpdated).toBe(1);

    const friends = useAppStore.getState().friends;
    expect(friends).toHaveLength(2);
    expect(friends.find((f) => f.id === 'friend-1')?.name).toBe('Sarah Connor (Updated)');
    expect(friends.find((f) => f.id === 'friend-2')?.name).toBe('John Connor');
  });

  it('ignores older incoming duplicates during merge', () => {
    // Current is newer than backup
    useAppStore.setState({
      friends: [
        {
          id: 'friend-1',
          name: 'Sarah Connor (Latest)',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-10T00:00:00.000Z',
        },
      ],
    });

    const summary = useAppStore.getState().importBackup(mockBackup, 'merge');
    expect(summary.friendsUpdated).toBe(0);
    const friend = useAppStore.getState().friends.find((f) => f.id === 'friend-1');
    expect(friend?.name).toBe('Sarah Connor (Latest)');
  });

  it('replaces all current data cleanly in replace mode', () => {
    const summary = useAppStore.getState().importBackup(mockBackup, 'replace');

    expect(summary.friendsAdded).toBe(2);
    expect(useAppStore.getState().friends).toHaveLength(2);
    expect(useAppStore.getState().interactions).toHaveLength(1);
    expect(useAppStore.getState().gratitudeList).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/store/__tests__/import.test.ts`
Expected: FAIL (`importBackup is not a function`)

- [ ] **Step 3: Implement `importBackup` in `src/store/index.ts`**

Define `ImportSummary` and `ImportMode` in `src/store/types.ts`:
```ts
import type { BackupFile } from '@/services/backup-schema';

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

Add `importBackup` to `useAppStore` in `src/store/index.ts`:
```ts
importBackup: (backup: BackupFile, mode: ImportMode): ImportSummary => {
  let summary: ImportSummary = {
    friendsAdded: 0,
    friendsUpdated: 0,
    interactionsAdded: 0,
    interactionsUpdated: 0,
    gratitudeAdded: 0,
    gratitudeUpdated: 0,
  };

  set((state) => {
    if (mode === 'replace') {
      summary = {
        friendsAdded: backup.data.friends.length,
        friendsUpdated: 0,
        interactionsAdded: backup.data.interactions.length,
        interactionsUpdated: 0,
        gratitudeAdded: backup.data.gratitude.length,
        gratitudeUpdated: 0,
      };
      return {
        friends: [...backup.data.friends],
        interactions: [...backup.data.interactions],
        gratitudeList: [...backup.data.gratitude],
      };
    }

    // Merge Friends
    const friendMap = new Map(state.friends.map((f) => [f.id, f]));
    for (const incoming of backup.data.friends) {
      const existing = friendMap.get(incoming.id);
      if (!existing) {
        friendMap.set(incoming.id, incoming);
        summary.friendsAdded++;
      } else if (new Date(incoming.updatedAt) > new Date(existing.updatedAt)) {
        friendMap.set(incoming.id, incoming);
        summary.friendsUpdated++;
      }
    }

    // Merge Interactions
    const interactionMap = new Map(state.interactions.map((i) => [i.id, i]));
    for (const incoming of backup.data.interactions) {
      const existing = interactionMap.get(incoming.id);
      if (!existing) {
        interactionMap.set(incoming.id, incoming);
        summary.interactionsAdded++;
      } else if (new Date(incoming.updatedAt) > new Date(existing.updatedAt)) {
        interactionMap.set(incoming.id, incoming);
        summary.interactionsUpdated++;
      }
    }

    // Merge Gratitude
    const gratitudeMap = new Map(state.gratitudeList.map((g) => [g.id, g]));
    for (const incoming of backup.data.gratitude) {
      const existing = gratitudeMap.get(incoming.id);
      if (!existing) {
        gratitudeMap.set(incoming.id, incoming);
        summary.gratitudeAdded++;
      } else if (new Date(incoming.updatedAt) > new Date(existing.updatedAt)) {
        gratitudeMap.set(incoming.id, incoming);
        summary.gratitudeUpdated++;
      }
    }

    return {
      friends: Array.from(friendMap.values()),
      interactions: Array.from(interactionMap.values()),
      gratitudeList: Array.from(gratitudeMap.values()),
    };
  });

  return summary;
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/store/__tests__/import.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/store/types.ts src/store/index.ts src/store/__tests__/import.test.ts
git commit -m "feat(store): implement atomic importBackup action with merge and replace support"
```

---

### Task 4: Backup Service & Staging System

**Files:**
- Create: `src/services/backup.ts`
- Create: `src/services/__tests__/backup.test.ts`

**Interfaces:**
- Produces: `exportBackupAsync(): Promise<{ success: boolean; filePath?: string; error?: string }>`
- Produces: `pickAndValidateBackupAsync(): Promise<PickBackupResult>`
- Produces: `stageBackup(backup: BackupFile): void`
- Produces: `getStagedBackup(): BackupFile | null`
- Produces: `clearStagedBackup(): void`

- [ ] **Step 1: Write unit tests for `backup.ts` in `src/services/__tests__/backup.test.ts`**

Create `src/services/__tests__/backup.test.ts`:
```ts
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  clearStagedBackup,
  exportBackupAsync,
  getStagedBackup,
  pickAndValidateBackupAsync,
  stageBackup,
} from '../backup';
import type { BackupFile } from '../backup-schema';

describe('Backup Service', () => {
  afterEach(() => {
    clearStagedBackup();
    jest.clearAllMocks();
  });

  it('manages in-memory staged backup lifecycle', () => {
    expect(getStagedBackup()).toBeNull();

    const mock: BackupFile = {
      app: 'friend-gratitude',
      schemaVersion: 1,
      exportedAt: '2026-10-08T12:00:00.000Z',
      data: { friends: [], interactions: [], gratitude: [] },
    };

    stageBackup(mock);
    expect(getStagedBackup()).toEqual(mock);

    clearStagedBackup();
    expect(getStagedBackup()).toBeNull();
  });

  it('exports backup and shares file', async () => {
    const result = await exportBackupAsync();
    expect(result.success).toBe(true);
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
    expect(Sharing.shareAsync).toHaveBeenCalled();
  });

  it('returns cancelled when document picker is cancelled', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: true,
      assets: [],
    });

    const result = await pickAndValidateBackupAsync();
    expect(result.status).toBe('cancelled');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/services/__tests__/backup.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `src/services/backup.ts`**

Write `src/services/backup.ts` with platform guards, serialization, share sheet integration, and staging holder:
```ts
import { format } from 'date-fns';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { useAppStore } from '@/store';
import { appActions } from '@/store/hooks';
import {
  CURRENT_BACKUP_SCHEMA_VERSION,
  validateAndMigrateBackup,
  type BackupFile,
} from './backup-schema';

let stagedBackupHolder: BackupFile | null = null;

export function stageBackup(backup: BackupFile): void {
  stagedBackupHolder = backup;
}

export function getStagedBackup(): BackupFile | null {
  return stagedBackupHolder;
}

export function clearStagedBackup(): void {
  stagedBackupHolder = null;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export async function exportBackupAsync(now: Date = new Date()): Promise<ExportResult> {
  try {
    const state = useAppStore.getState();
    const backup: BackupFile = {
      app: 'friend-gratitude',
      schemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
      exportedAt: now.toISOString(),
      data: {
        friends: state.friends,
        interactions: state.interactions,
        gratitude: state.gratitudeList,
        settings: state.settings,
      },
    };

    const jsonContent = JSON.stringify(backup, null, 2);
    const dateStr = format(now, 'yyyy-MM-dd');
    const fileName = `friend-gratitude-backup-${dateStr}.json`;

    if (Platform.OS === 'web') {
      // Web file download fallback
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      appActions().updateSettings({ lastBackupAt: now.toISOString() });
      return { success: true };
    }

    const filePath = `${FileSystem.cacheDirectory ?? ''}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, jsonContent);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Export Keepsake Backup',
        UTI: 'public.json',
      });
    }

    appActions().updateSettings({ lastBackupAt: now.toISOString() });
    return { success: true, filePath };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown export error';
    return { success: false, error: message };
  }
}

export type PickBackupResult =
  | { status: 'success'; backup: BackupFile }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

export async function pickAndValidateBackupAsync(): Promise<PickBackupResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/json', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { status: 'cancelled' };
    }

    const asset = result.assets[0];
    if (!asset || !asset.uri) {
      return { status: 'error', message: 'No file selected.' };
    }

    let fileContent = '';
    if (Platform.OS === 'web' && asset.file) {
      fileContent = await asset.file.text();
    } else {
      fileContent = await FileSystem.readAsStringAsync(asset.uri);
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(fileContent);
    } catch {
      return {
        status: 'error',
        message: 'The selected file is not a valid JSON document.',
      };
    }

    const validation = validateAndMigrateBackup(parsedJson);
    if (!validation.success) {
      return { status: 'error', message: validation.error };
    }

    stageBackup(validation.data);
    return { status: 'success', backup: validation.data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to read document.';
    return { status: 'error', message: msg };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/services/__tests__/backup.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add src/services/backup.ts src/services/__tests__/backup.test.ts
git commit -m "feat(backup): implement export, document picking, and staging in backup service"
```

---

### Task 5: Upgrade Settings Screen with Backup Controls & Health Monitoring

**Files:**
- Modify: `src/app/(tabs)/settings.tsx`

**Interfaces:**
- Connects: `exportBackupAsync` and `pickAndValidateBackupAsync` to buttons
- Renders: Recency status ("Last backup: 3 days ago", "Never")
- Renders: Gentle notice banner if `lastBackupAt` is >30 days ago (or absent with data)

- [ ] **Step 1: Update "Your Data" card in `src/app/(tabs)/settings.tsx`**

Replace the placeholder/coming soon block in `src/app/(tabs)/settings.tsx` with:
- "Export Backup" button with share icon
- "Import Backup" button with upload/document icon
- Humanized recency text using `formatDistanceToNow` or similar friendly copy
- Soft reminder banner if last backup was >30 days ago
- Error alert handler when `pickAndValidateBackupAsync` returns `{ status: 'error' }`
- Routing to `/import-preview` when `pickAndValidateBackupAsync` returns `{ status: 'success' }`

- [ ] **Step 2: Verify Settings screen renders cleanly and passes tests**

Run: `npm test && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit changes**

```bash
git add src/app/\(tabs\)/settings.tsx
git commit -m "feat(settings): upgrade Your Data card with backup export, import trigger, and recency notice"
```

---

### Task 6: Implement `/import-preview` Screen & Router Registration

**Files:**
- Create: `src/app/import-preview.tsx`
- Modify: `src/app/_layout.tsx`

**Interfaces:**
- Consumes: `getStagedBackup()`, `clearStagedBackup()`, `useAppStore().importBackup`, `syncAllNotifications`
- Produces: Modal screen registered with Expo Router in `src/app/_layout.tsx`

- [ ] **Step 1: Register `/import-preview` route in `src/app/_layout.tsx`**

Add stack screen to `src/app/_layout.tsx`:
```tsx
<Stack.Screen
  name="import-preview"
  options={{
    presentation: 'modal',
    title: 'Restore Backup',
  }}
/>
```

- [ ] **Step 2: Implement `src/app/import-preview.tsx`**

Build the preview screen:
- Reads `getStagedBackup()`. If empty or null, renders a friendly fallback and offers a button to return to Settings.
- Shows backup details:
  - Formatted export timestamp
  - Comparison table: Incoming vs Current (Friends, Moments, Gratitude)
  - Diff breakdown (calculating how many are new vs how many already exist)
- Buttons:
  - **"Merge with Existing Data"** (`Button` variant="primary")
    - Executes `importBackup(staged, 'merge')`
    - Calls `syncAllNotifications(useAppStore.getState())`
    - Clears staged backup
    - Alerts with friendly summary: *"Import complete! Added {added} and updated {updated} records."*
    - Navigates back (`router.back()`)
  - **"Replace All Data"** (`Button` variant="outline")
    - Shows confirmation alert: *"Replace all data? This overwrites current records with this backup."*
    - Options: `Safety Backup` (triggers `exportBackupAsync`), `Replace`, `Cancel`
    - On confirmation: executes `importBackup(staged, 'replace')`, resyncs notifications, clears staged backup, alerts success, and navigates back.
  - **"Cancel"** (`Button` variant="ghost")
    - Clears staged backup and calls `router.back()`.

- [ ] **Step 3: Run tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit changes**

```bash
git add src/app/import-preview.tsx src/app/_layout.tsx
git commit -m "feat(backup): create import preview modal screen with merge and replace support"
```

---

### Task 7: Full Verification, Lint & Integration Testing

**Files:**
- All touched files

- [ ] **Step 1: Run comprehensive test suite**

Run: `npm test`
Expected: PASS (all tests pass)

- [ ] **Step 2: Run TypeScript typecheck**

Run: `npm run typecheck`
Expected: PASS (0 errors)

- [ ] **Step 3: Run Expo linter**

Run: `npx expo lint`
Expected: PASS (0 lint warnings or errors)

- [ ] **Step 4: Run expo-doctor**

Run: `npx expo-doctor`
Expected: PASS (no dependency/config issues)

- [ ] **Step 5: Final commit if any polish touches made**

```bash
git status
```
