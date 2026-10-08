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
