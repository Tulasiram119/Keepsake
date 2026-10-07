import type { StateCreator } from 'zustand';

import type { FriendsSlice } from './friends-slice';
import type { GratitudeSlice } from './gratitude-slice';
import type { InteractionsSlice } from './interactions-slice';
import type { SettingsSlice } from './settings-slice';

export interface MetaSlice {
  hasHydrated: boolean;
}

export type AppState = FriendsSlice & InteractionsSlice & GratitudeSlice & SettingsSlice & MetaSlice;

export type PersistedState = Pick<AppState, 'friends' | 'interactions' | 'gratitude' | 'settings'>;

export type SliceCreator<T> = StateCreator<AppState, [['zustand/persist', unknown]], [], T>;
