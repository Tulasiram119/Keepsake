import type { BackupSlice, SliceCreator } from './types';

export const createBackupSlice: SliceCreator<BackupSlice> = (set) => ({
  importBackup: (backup, mode) => {
    let summary = {
      friendsAdded: 0,
      friendsUpdated: 0,
      interactionsAdded: 0,
      interactionsUpdated: 0,
      gratitudeAdded: 0,
      gratitudeUpdated: 0,
    };

    set((state) => {
      const backupSettings = backup.data.settings ?? {};
      const updatedSettings = {
        ...state.settings,
        ...backupSettings,
        lastBackupAt: new Date().toISOString(),
      };

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
          gratitude: [...backup.data.gratitude],
          settings: updatedSettings,
        };
      }

      // Merge Friends
      const friendMap = new Map(state.friends.map((f) => [f.id, f]));
      for (const incoming of backup.data.friends) {
        const existing = friendMap.get(incoming.id);
        if (!existing) {
          friendMap.set(incoming.id, incoming);
          summary.friendsAdded++;
        } else if (new Date(incoming.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
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
        } else if (new Date(incoming.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
          interactionMap.set(incoming.id, incoming);
          summary.interactionsUpdated++;
        }
      }

      // Merge Gratitude
      const gratitudeMap = new Map(state.gratitude.map((g) => [g.id, g]));
      for (const incoming of backup.data.gratitude) {
        const existing = gratitudeMap.get(incoming.id);
        if (!existing) {
          gratitudeMap.set(incoming.id, incoming);
          summary.gratitudeAdded++;
        } else if (new Date(incoming.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
          gratitudeMap.set(incoming.id, incoming);
          summary.gratitudeUpdated++;
        }
      }

      return {
        friends: Array.from(friendMap.values()),
        interactions: Array.from(interactionMap.values()),
        gratitude: Array.from(gratitudeMap.values()),
        settings: {
          ...state.settings,
          lastBackupAt: new Date().toISOString(),
        },
      };
    });

    return summary;
  },
});
