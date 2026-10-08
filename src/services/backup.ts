import { format } from 'date-fns';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
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
        gratitude: state.gratitude,
        settings: state.settings,
      },
    };

    const jsonContent = JSON.stringify(backup, null, 2);
    const dateStr = format(now, 'yyyy-MM-dd');
    const fileName = `friend-gratitude-backup-${dateStr}.json`;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
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

    const baseDir = FileSystem.cacheDirectory ?? '';
    const filePath = `${baseDir}${fileName}`;
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
