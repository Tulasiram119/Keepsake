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

  it('rejects non-object or null input', () => {
    const result = validateAndMigrateBackup('not-an-object');
    expect(result.success).toBe(false);
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
