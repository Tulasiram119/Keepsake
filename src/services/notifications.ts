import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { addDays, parseISO, setHours, setMinutes, setSeconds } from 'date-fns';

import type { AppState } from '@/store/types';
import { firstName, indexLastInteractions, isSnoozed } from '@/utils/derived';
import { INTERACTION_META } from '@/utils/interaction-meta';

// Initialize foreground notification handler and Android channel when not on web
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync('keepsake-reminders', {
      name: 'Keepsake Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C8553D',
    });
  }
}

export async function getNotificationPermissionStatusAsync(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function requestNotificationPermissionsAsync(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export function parseTime(
  timeStr: string | undefined,
  defaultHour = 10,
  defaultMinute = 0,
): { hour: number; minute: number } {
  if (!timeStr) return { hour: defaultHour, minute: defaultMinute };
  const parts = timeStr.split(':');
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  return {
    hour: Number.isFinite(hour) && hour >= 0 && hour <= 23 ? hour : defaultHour,
    minute: Number.isFinite(minute) && minute >= 0 && minute <= 59 ? minute : defaultMinute,
  };
}

export function getNextBirthdayDate(
  birthday: string | undefined,
  now: Date,
  hour = 9,
  minute = 0,
): Date | undefined {
  if (!birthday) return undefined;
  const parts = birthday.trim().split('-');
  let month: number;
  let day: number;

  if (parts.length === 3) {
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else if (parts.length === 2) {
    month = parseInt(parts[0], 10);
    day = parseInt(parts[1], 10);
  } else {
    return undefined;
  }

  if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return undefined;
  }

  const currentYear = now.getFullYear();
  let candidate = new Date(currentYear, month - 1, day, hour, minute, 0, 0);

  if (candidate <= now) {
    candidate = new Date(currentYear + 1, month - 1, day, hour, minute, 0, 0);
  }

  return candidate;
}

export async function syncAllNotifications(state: AppState, now: Date = new Date()): Promise<void> {
  if (Platform.OS === 'web') return;

  const hasPermission = await getNotificationPermissionStatusAsync();
  if (!hasPermission) return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    return;
  }

  const { friends, interactions, settings } = state;
  const activeFriends = friends.filter((f) => !f.archived);
  const lastByFriend = indexLastInteractions(interactions);
  const reminderTime = parseTime(settings.reminderTime, 10, 0);

  let scheduledCount = 0;
  const MAX_SCHEDULED = 50;

  // 1. Cadence Due Reminders
  for (const friend of activeFriends) {
    if (scheduledCount >= MAX_SCHEDULED) break;
    if (!friend.repeatEveryDays || friend.repeatEveryDays <= 0) continue;

    let targetDate: Date;
    if (isSnoozed(friend, now)) {
      targetDate = parseISO(friend.snoozedUntil!);
    } else {
      const last = lastByFriend.get(friend.id);
      const baseDate = parseISO(last?.date ?? friend.createdAt);
      const rawTarget = addDays(baseDate, friend.repeatEveryDays);
      targetDate = setSeconds(
        setMinutes(setHours(rawTarget, reminderTime.hour), reminderTime.minute),
        0,
      );
    }

    if (targetDate > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Keeping in touch',
          body: `It's been a while since you spoke with ${firstName(friend.name)}.`,
          data: { friendId: friend.id, type: 'cadence' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: targetDate,
          channelId: 'keepsake-reminders',
        },
      });
      scheduledCount++;
    }
  }

  // 2. Planned Contact Reminders
  for (const friend of activeFriends) {
    if (scheduledCount >= MAX_SCHEDULED) break;
    if (!friend.nextPlanned?.at) continue;

    const plannedDate = parseISO(friend.nextPlanned.at);
    if (plannedDate > now) {
      const meta = INTERACTION_META[friend.nextPlanned.type];
      const typeLabel = meta ? meta.label.toLowerCase() : 'moment';
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Planned connection',
          body: `Planned ${typeLabel} with ${firstName(friend.name)} coming up.`,
          data: { friendId: friend.id, type: 'planned' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: plannedDate,
          channelId: 'keepsake-reminders',
        },
      });
      scheduledCount++;
    }
  }

  // 3. Birthday Reminders
  if (settings.birthdayRemindersEnabled) {
    for (const friend of activeFriends) {
      if (scheduledCount >= MAX_SCHEDULED) break;
      if (!friend.birthday) continue;

      const nextBday = getNextBirthdayDate(friend.birthday, now, 9, 0);
      if (nextBday && nextBday > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Birthday today! 🎂',
            body: `Today is ${firstName(friend.name)}'s birthday.`,
            data: { friendId: friend.id, type: 'birthday' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: nextBday,
            channelId: 'keepsake-reminders',
          },
        });
        scheduledCount++;
      }
    }
  }

  // 4. Daily Gratitude Prompt
  if (settings.dailyPromptEnabled && scheduledCount < MAX_SCHEDULED) {
    const promptTime = parseTime(settings.dailyPromptTime, 20, 0);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'A moment of gratitude 🌿',
        body: "What is one thing you're thankful for today?",
        data: { type: 'daily-gratitude' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: promptTime.hour,
        minute: promptTime.minute,
        channelId: 'keepsake-reminders',
      },
    });
  }
}
