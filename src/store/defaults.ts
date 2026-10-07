import type { Settings } from '@/types/models';

import type { PersistedState } from './types';

export const DEFAULT_SETTINGS: Settings = {
  dailyPromptEnabled: false,
  dailyPromptTime: '20:00',
  birthdayRemindersEnabled: false,
  reminderTime: '10:00',
  theme: 'system',
};

export const EMPTY_DATA: PersistedState = {
  friends: [],
  interactions: [],
  gratitude: [],
  settings: DEFAULT_SETTINGS,
};
