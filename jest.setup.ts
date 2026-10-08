jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-crypto', () => ({
  randomUUID: () => require('crypto').randomUUID(),
}));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted', granted: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted', granted: true }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('test-notification-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  AndroidImportance: {
    HIGH: 4,
    DEFAULT: 3,
  },
  SchedulableTriggerInputTypes: {
    DATE: 'date',
    DAILY: 'daily',
    CALENDAR: 'calendar',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
    TIME_INTERVAL: 'timeInterval',
  },
}));

const mockFileSystem = {
  cacheDirectory: 'file:///test-cache/',
  documentDirectory: 'file:///test-docs/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue('{}'),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, isDirectory: false, size: 1024 }),
};

jest.mock('expo-file-system', () => mockFileSystem);
jest.mock('expo-file-system/legacy', () => mockFileSystem);

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));
