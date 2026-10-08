import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storageAdapter } from '@/storage/adapter';

import { DEFAULT_SETTINGS } from './defaults';
import { createBackupSlice } from './backup-slice';
import { createFriendsSlice } from './friends-slice';
import { createGratitudeSlice } from './gratitude-slice';
import { createInteractionsSlice } from './interactions-slice';
import { migratePersisted } from './migrations';
import { createSettingsSlice } from './settings-slice';
import type { AppState, PersistedState } from './types';

export const STORE_KEY = 'keepsake-store';
export const STORE_VERSION = 1;

export const useAppStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createFriendsSlice(...a),
      ...createInteractionsSlice(...a),
      ...createGratitudeSlice(...a),
      ...createSettingsSlice(...a),
      ...createBackupSlice(...a),
      hasHydrated: false,
    }),
    {
      name: STORE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => storageAdapter),
      partialize: (s): PersistedState => ({
        friends: s.friends,
        interactions: s.interactions,
        gratitude: s.gratitude,
        settings: s.settings,
      }),
      migrate: (persisted, version) => migratePersisted(persisted, version),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedState>;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...p.settings } };
      },
      // AsyncStorage is async, so this runs after `useAppStore` is assigned.
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.warn('Keepsake: failed to load saved data', error);
        useAppStore.setState({ hasHydrated: true });
      },
    },
  ),
);

export type { AppState } from './types';
