import * as Notifications from 'expo-notifications';

import { DEFAULT_SETTINGS } from '@/store/defaults';
import type { AppState } from '@/store/types';
import { getNextBirthdayDate, syncAllNotifications } from '../notifications';

describe('getNextBirthdayDate', () => {
  it('calculates the next upcoming birthday for MM-DD format', () => {
    const now = new Date('2026-10-07T10:00:00.000Z');
    // Birthday upcoming this year: Nov 15
    const upcoming = getNextBirthdayDate('11-15', now, 9, 0);
    expect(upcoming?.getFullYear()).toBe(2026);
    expect(upcoming?.getMonth()).toBe(10); // 0-indexed November
    expect(upcoming?.getDate()).toBe(15);
    expect(upcoming?.getHours()).toBe(9);

    // Birthday already passed this year: Jan 10 -> Should be next year
    const passed = getNextBirthdayDate('01-10', now, 9, 0);
    expect(passed?.getFullYear()).toBe(2027);
    expect(passed?.getMonth()).toBe(0); // 0-indexed January
    expect(passed?.getDate()).toBe(10);
  });

  it('calculates the next upcoming birthday for YYYY-MM-DD format', () => {
    const now = new Date('2026-10-07T10:00:00.000Z');
    const bday = getNextBirthdayDate('1995-12-25', now, 9, 0);
    expect(bday?.getFullYear()).toBe(2026);
    expect(bday?.getMonth()).toBe(11);
    expect(bday?.getDate()).toBe(25);
  });
});

describe('syncAllNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cancels existing and schedules cadence, planned contact, and daily prompt', async () => {
    const mockState: Partial<AppState> = {
      friends: [
        {
          id: 'f1',
          name: 'Priya',
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
          repeatEveryDays: 7,
          nextPlanned: {
            at: '2026-10-09T18:00:00.000Z',
            type: 'called',
          },
          birthday: '10-20',
        },
      ],
      interactions: [],
      gratitude: [],
      settings: {
        ...DEFAULT_SETTINGS,
        dailyPromptEnabled: true,
        birthdayRemindersEnabled: true,
      },
    };

    const now = new Date('2026-10-05T00:00:00.000Z');
    await syncAllNotifications(mockState as AppState, now);

    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    // Should have scheduled cadence, planned contact, birthday, and daily prompt
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(4);
  });

  it('respects snoozedUntil for cadence reminders', async () => {
    const mockState: Partial<AppState> = {
      friends: [
        {
          id: 'f1',
          name: 'Priya',
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
          repeatEveryDays: 7,
          snoozedUntil: '2026-10-12T10:00:00.000Z',
        },
      ],
      interactions: [],
      gratitude: [],
      settings: {
        ...DEFAULT_SETTINGS,
        dailyPromptEnabled: false,
        birthdayRemindersEnabled: false,
      },
    };

    const now = new Date('2026-10-05T00:00:00.000Z');
    await syncAllNotifications(mockState as AppState, now);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: 'Keeping in touch',
        }),
        trigger: expect.objectContaining({
          type: 'date',
          date: new Date('2026-10-12T10:00:00.000Z'),
        }),
      }),
    );
  });
});
