import { addDays } from 'date-fns';

import type { Friend, FriendInput, ID, PlannedContact } from '@/types/models';
import { newId } from '@/utils/id';

import type { SliceCreator } from './types';

export interface FriendsSlice {
  friends: Friend[];
  addFriend: (input: FriendInput) => Friend;
  updateFriend: (id: ID, patch: Partial<FriendInput>) => void;
  setArchived: (id: ID, archived: boolean) => void;
  setPlannedContact: (id: ID, planned: PlannedContact | undefined) => void;
  snoozeFriend: (id: ID, days: number) => void;
  skipCycle: (id: ID) => void;
  clearSnooze: (id: ID) => void;
  deleteFriend: (id: ID) => void;
}

const TEXT_FIELDS = ['name', 'photoUri', 'phone', 'birthday', 'howWeMet', 'notes', 'group'] as const;

/** Trims text fields; blank optional fields become undefined. */
function tidy<T extends Partial<FriendInput>>(input: T): T {
  const out: Record<string, unknown> = { ...input };
  for (const key of TEXT_FIELDS) {
    const value = out[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      out[key] = trimmed === '' && key !== 'name' ? undefined : trimmed;
    }
  }
  return out as T;
}

export const createFriendsSlice: SliceCreator<FriendsSlice> = (set, get) => ({
  friends: [],

  addFriend: (input) => {
    const now = new Date().toISOString();
    const friend: Friend = { ...tidy(input), id: newId(), createdAt: now, updatedAt: now };
    set((s) => ({ friends: [...s.friends, friend] }));
    return friend;
  },

  updateFriend: (id, patch) => {
    const now = new Date().toISOString();
    const clean = tidy(patch);
    set((s) => ({
      friends: s.friends.map((f) => (f.id === id ? { ...f, ...clean, updatedAt: now } : f)),
    }));
  },

  setArchived: (id, archived) => get().updateFriend(id, { archived }),

  setPlannedContact: (id, planned) => get().updateFriend(id, { nextPlanned: planned }),

  snoozeFriend: (id, days) => {
    const until = addDays(new Date(), days).toISOString();
    get().updateFriend(id, { snoozedUntil: until });
  },

  skipCycle: (id) => {
    const friend = get().friends.find((f) => f.id === id);
    const interval = friend?.repeatEveryDays ?? 7;
    const until = addDays(new Date(), interval).toISOString();
    get().updateFriend(id, { snoozedUntil: until });
  },

  clearSnooze: (id) => {
    get().updateFriend(id, { snoozedUntil: undefined });
  },

  deleteFriend: (id) => {
    const now = new Date().toISOString();
    set((s) => ({
      friends: s.friends.filter((f) => f.id !== id),
      interactions: s.interactions.filter((i) => i.friendId !== id),
      gratitude: s.gratitude.map((g) =>
        g.friendIds.includes(id)
          ? { ...g, friendIds: g.friendIds.filter((x) => x !== id), updatedAt: now }
          : g,
      ),
    }));
  },
});
