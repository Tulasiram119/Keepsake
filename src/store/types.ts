import type { StateCreator } from 'zustand';

import type { FriendsSlice } from './friends-slice';
import type { GratitudeSlice } from './gratitude-slice';
import type { InteractionsSlice } from './interactions-slice';
import type { SettingsSlice } from './settings-slice';

import type { BackupFile } from '@/services/backup-schema';

export interface MetaSlice {
  hasHydrated: boolean;
}

export type ImportMode = 'merge' | 'replace';

export interface ImportSummary {
  friendsAdded: number;
  friendsUpdated: number;
  interactionsAdded: number;
  interactionsUpdated: number;
  gratitudeAdded: number;
  gratitudeUpdated: number;
}

export interface BackupSlice {
  importBackup: (backup: BackupFile, mode: ImportMode) => ImportSummary;
}

export type AppState = FriendsSlice &
  InteractionsSlice &
  GratitudeSlice &
  SettingsSlice &
  MetaSlice &
  BackupSlice;

export type PersistedState = Pick<AppState, 'friends' | 'interactions' | 'gratitude' | 'settings'>;

export type SliceCreator<T> = StateCreator<AppState, [['zustand/persist', unknown]], [], T>;
