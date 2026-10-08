import { differenceInCalendarDays, parseISO } from 'date-fns';

import type { ID, Interaction, InteractionInput } from '@/types/models';
import { newId } from '@/utils/id';

import type { SliceCreator } from './types';

export interface InteractionsSlice {
  interactions: Interaction[];
  logInteraction: (input: InteractionInput) => Interaction;
  updateInteraction: (id: ID, patch: Partial<InteractionInput>) => void;
  deleteInteraction: (id: ID) => void;
}

const tidyNote = (note: string | undefined) => note?.trim() || undefined;

export const createInteractionsSlice: SliceCreator<InteractionsSlice> = (set) => ({
  interactions: [],

  logInteraction: (input) => {
    const now = new Date().toISOString();
    const interaction: Interaction = {
      ...input,
      note: tidyNote(input.note),
      id: newId(),
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({
      interactions: [...s.interactions, interaction],
      friends: s.friends.map((f) => {
        if (f.id !== input.friendId) return f;
        const clearsPlanned =
          f.nextPlanned &&
          differenceInCalendarDays(parseISO(input.date), parseISO(f.nextPlanned.at)) >= 0;
        return {
          ...f,
          snoozedUntil: undefined,
          nextPlanned: clearsPlanned ? undefined : f.nextPlanned,
          updatedAt: now,
        };
      }),
    }));
    return interaction;
  },

  updateInteraction: (id, patch) => {
    const now = new Date().toISOString();
    set((s) => ({
      interactions: s.interactions.map((i) =>
        i.id === id
          ? {
              ...i,
              ...patch,
              ...('note' in patch ? { note: tidyNote(patch.note) } : {}),
              updatedAt: now,
            }
          : i,
      ),
    }));
  },

  deleteInteraction: (id) => set((s) => ({ interactions: s.interactions.filter((i) => i.id !== id) })),
});
