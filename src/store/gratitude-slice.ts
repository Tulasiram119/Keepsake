import type { GratitudeEntry, GratitudeInput, ID } from '@/types/models';
import { newId } from '@/utils/id';

import type { SliceCreator } from './types';

export interface GratitudeSlice {
  gratitude: GratitudeEntry[];
  addGratitude: (input: GratitudeInput) => GratitudeEntry;
  updateGratitude: (id: ID, patch: Partial<GratitudeInput>) => void;
  deleteGratitude: (id: ID) => void;
}

function tidy(patch: Partial<GratitudeInput>): Partial<GratitudeInput> {
  const out: Partial<GratitudeInput> = { ...patch };
  if ('text' in patch) out.text = (patch.text ?? '').trim();
  if ('tag' in patch) out.tag = patch.tag?.trim() || undefined;
  if (patch.friendIds) out.friendIds = [...new Set(patch.friendIds)];
  return out;
}

export const createGratitudeSlice: SliceCreator<GratitudeSlice> = (set) => ({
  gratitude: [],

  addGratitude: (input) => {
    const now = new Date().toISOString();
    const entry: GratitudeEntry = {
      ...input,
      ...(tidy(input) as GratitudeInput),
      id: newId(),
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ gratitude: [...s.gratitude, entry] }));
    return entry;
  },

  updateGratitude: (id, patch) => {
    const now = new Date().toISOString();
    const clean = tidy(patch);
    set((s) => ({
      gratitude: s.gratitude.map((g) => (g.id === id ? { ...g, ...clean, updatedAt: now } : g)),
    }));
  },

  deleteGratitude: (id) => set((s) => ({ gratitude: s.gratitude.filter((g) => g.id !== id) })),
});
