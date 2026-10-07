import type { ID } from '@/types/models';

import { useAppStore } from './index';

export const useFriends = () => useAppStore((s) => s.friends);
export const useFriend = (id: ID | undefined) =>
  useAppStore((s) => (id ? s.friends.find((f) => f.id === id) : undefined));
export const useInteractions = () => useAppStore((s) => s.interactions);
export const useGratitude = () => useAppStore((s) => s.gratitude);
export const useSettings = () => useAppStore((s) => s.settings);
export const useHasHydrated = () => useAppStore((s) => s.hasHydrated);

/** Imperative access to actions from event handlers (no re-render subscription). */
export const appActions = () => useAppStore.getState();
