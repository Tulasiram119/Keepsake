export type ID = string;
export type ISODate = string;

export type InteractionType = 'met' | 'called' | 'texted' | 'video';

export interface PlannedContact {
  at: ISODate;
  type: InteractionType;
  notificationId?: string;
}

export interface Friend {
  id: ID;
  name: string;
  photoUri?: string;
  phone?: string;
  birthday?: string; // "MM-DD" or "YYYY-MM-DD"
  howWeMet?: string;
  notes?: string;
  group?: string;
  repeatEveryDays?: number;
  nextPlanned?: PlannedContact;
  snoozedUntil?: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
  archived?: boolean;
}

export interface Interaction {
  id: ID;
  friendId: ID;
  type: InteractionType;
  date: ISODate;
  note?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface GratitudeEntry {
  id: ID;
  text: string;
  date: ISODate;
  friendIds: ID[]; // empty = general gratitude
  tag?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type ThemePreference = 'warm-light' | 'warm-dark' | 'system';

export interface Settings {
  dailyPromptEnabled: boolean;
  dailyPromptTime: string;
  birthdayRemindersEnabled: boolean;
  reminderTime: string;
  theme: ThemePreference;
}

export type FriendInput = Omit<Friend, 'id' | 'createdAt' | 'updatedAt'>;
export type InteractionInput = Pick<Interaction, 'friendId' | 'type' | 'date' | 'note'>;
export type GratitudeInput = Pick<GratitudeEntry, 'text' | 'date' | 'friendIds' | 'tag'>;
