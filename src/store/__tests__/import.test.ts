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
      gratitude: [],
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
    expect(useAppStore.getState().gratitude).toHaveLength(1);
  });
});
