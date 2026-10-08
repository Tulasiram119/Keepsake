import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

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

  it('returns error when file contains invalid JSON', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///invalid.json' }],
    });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce('not-valid-json');

    const result = await pickAndValidateBackupAsync();
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.message).toMatch(/valid JSON/i);
    }
  });

  it('returns success and stages backup when picking valid file', async () => {
    const validJson = JSON.stringify({
      app: 'friend-gratitude',
      schemaVersion: 1,
      exportedAt: '2026-10-08T12:00:00.000Z',
      data: { friends: [], interactions: [], gratitude: [] },
    });

    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///valid-backup.json' }],
    });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce(validJson);

    const result = await pickAndValidateBackupAsync();
    expect(result.status).toBe('success');
    expect(getStagedBackup()).not.toBeNull();
  });
});
