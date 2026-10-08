import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { Platform, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import {
  getNotificationPermissionStatusAsync,
  requestNotificationPermissionsAsync,
  syncAllNotifications,
} from '@/services/notifications';
import { useAppStore } from '@/store';
import {
  appActions,
  useFriends,
  useGratitude,
  useInteractions,
  useSettings,
} from '@/store/hooks';
import { useTheme } from '@/theme/use-theme';
import type { Settings, ThemePreference } from '@/types/models';

const REMINDER_TIME_OPTIONS = [
  { label: '9:00 AM', value: '09:00' },
  { label: '10:00 AM', value: '10:00' },
  { label: '12:00 PM', value: '12:00' },
  { label: '6:00 PM', value: '18:00' },
];

const DAILY_PROMPT_TIME_OPTIONS = [
  { label: '7:00 PM', value: '19:00' },
  { label: '8:00 PM', value: '20:00' },
  { label: '9:00 PM', value: '21:00' },
  { label: '10:00 PM', value: '22:00' },
];

export default function SettingsScreen() {
  const settings = useSettings();
  const friends = useFriends();
  const interactions = useInteractions();
  const gratitudeList = useGratitude();
  const { colors, radius, spacing } = useTheme();

  const [hasPermission, setHasPermission] = useState<boolean>(true);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      void getNotificationPermissionStatusAsync().then((status) => {
        setHasPermission(status);
      });
    }
  }, []);

  const handleSettingChange = (patch: Partial<Settings>) => {
    appActions().updateSettings(patch);
    void syncAllNotifications(useAppStore.getState());
  };

  const handleThemeChange = (t: ThemePreference) => {
    handleSettingChange({ theme: t });
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermissionsAsync();
    setHasPermission(granted);
    if (granted) {
      void syncAllNotifications(useAppStore.getState());
    }
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen scroll padded>
      <ScreenHeader
        eyebrow="Preferences"
        title="Settings"
        subtitle="Theme, reminders, and storage"
      />

      {/* Appearance Section */}
      <Card tone="surface" style={[styles.card, { marginBottom: spacing.lg }]}>
        <ThemedText variant="subheading" style={{ marginBottom: spacing.xs }}>
          Appearance
        </ThemedText>
        <ThemedText
          variant="small"
          color="textSecondary"
          style={{ marginBottom: spacing.md }}
        >
          Choose a warm palette that suits your ambient lighting.
        </ThemedText>

        <View style={[styles.chipsRow, { gap: spacing.xs }]}>
          <Chip
            label="System"
            selected={settings.theme === 'system'}
            onPress={() => handleThemeChange('system')}
          />
          <Chip
            label="Warm light"
            selected={settings.theme === 'warm-light'}
            onPress={() => handleThemeChange('warm-light')}
          />
          <Chip
            label="Warm dark"
            selected={settings.theme === 'warm-dark'}
            onPress={() => handleThemeChange('warm-dark')}
          />
        </View>
      </Card>

      {/* Reminders Card */}
      <Card tone="surface" style={[styles.card, { marginBottom: spacing.lg }]}>
        <ThemedText variant="subheading" style={{ marginBottom: spacing.xs }}>
          Reminders & Nudges
        </ThemedText>
        <ThemedText
          variant="small"
          color="textSecondary"
          style={{ marginBottom: spacing.md }}
        >
          Quiet local notifications to keep friends and gratitude close.
        </ThemedText>

        {Platform.OS !== 'web' && !hasPermission && (
          <View
            style={[
              styles.permissionBanner,
              {
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.md,
              },
            ]}
          >
            <ThemedText variant="small" color="text" style={{ marginBottom: spacing.xs }}>
              Notifications are currently not allowed. Turn them on to receive scheduled reminders.
            </ThemedText>
            <Button
              label="Enable Notifications"
              variant="primary"
              onPress={handleRequestPermission}
            />
          </View>
        )}

        {/* Reminder Time */}
        <View style={{ marginBottom: spacing.md }}>
          <ThemedText variant="smallStrong" style={{ marginBottom: spacing.xs / 2 }}>
            Stay-in-touch time
          </ThemedText>
          <ThemedText
            variant="small"
            color="textSecondary"
            style={{ marginBottom: spacing.xs }}
          >
            When to deliver stay-in-touch cadence nudges.
          </ThemedText>
          <View style={[styles.chipsRow, { gap: spacing.xs }]}>
            {REMINDER_TIME_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={settings.reminderTime === opt.value}
                onPress={() => handleSettingChange({ reminderTime: opt.value })}
              />
            ))}
          </View>
        </View>

        {/* Birthday Reminders */}
        <View
          style={[
            styles.toggleRow,
            {
              borderTopWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
              paddingTop: spacing.md,
              marginBottom: spacing.md,
            },
          ]}
        >
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <ThemedText variant="bodyStrong">Birthday reminders</ThemedText>
            <ThemedText variant="small" color="textSecondary">
              Notify at 9:00 AM on your friends' birthdays.
            </ThemedText>
          </View>
          <Switch
            value={settings.birthdayRemindersEnabled}
            onValueChange={(val) => handleSettingChange({ birthdayRemindersEnabled: val })}
            trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>

        {/* Daily Gratitude Prompt */}
        <View
          style={[
            styles.toggleRow,
            {
              borderTopWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
              paddingTop: spacing.md,
              marginBottom: settings.dailyPromptEnabled ? spacing.sm : 0,
            },
          ]}
        >
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <ThemedText variant="bodyStrong">Daily gratitude prompt</ThemedText>
            <ThemedText variant="small" color="textSecondary">
              A quiet reflection nudge at the end of the day.
            </ThemedText>
          </View>
          <Switch
            value={settings.dailyPromptEnabled}
            onValueChange={(val) => handleSettingChange({ dailyPromptEnabled: val })}
            trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>

        {settings.dailyPromptEnabled && (
          <View style={{ marginTop: spacing.xs }}>
            <ThemedText
              variant="small"
              color="textSecondary"
              style={{ marginBottom: spacing.xs }}
            >
              Prompt time
            </ThemedText>
            <View style={[styles.chipsRow, { gap: spacing.xs }]}>
              {DAILY_PROMPT_TIME_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={settings.dailyPromptTime === opt.value}
                  onPress={() => handleSettingChange({ dailyPromptTime: opt.value })}
                />
              ))}
            </View>
          </View>
        )}
      </Card>

      {/* Your Data Card */}
      <Card tone="surface" style={[styles.card, { marginBottom: spacing.xl }]}>
        <View style={styles.cardHeaderRow}>
          <ThemedText variant="subheading">Your Data</ThemedText>
          <View
            style={[
              styles.comingSoonPill,
              {
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.pill,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
              },
            ]}
          >
            <ThemedText variant="small" color="textSecondary">
              Coming soon
            </ThemedText>
          </View>
        </View>

        <ThemedText
          variant="body"
          color="textSecondary"
          style={{ marginTop: spacing.xs, marginBottom: spacing.md }}
        >
          Everything stays private on your phone. Export and import backups are
          on the way.
        </ThemedText>

        <View
          style={[
            styles.statsBox,
            {
              backgroundColor: colors.surfaceAlt,
              borderRadius: radius.sm,
              padding: spacing.md,
            },
          ]}
        >
          <ThemedText variant="smallStrong" color="text">
            {friends.length} {friends.length === 1 ? 'friend' : 'friends'} ·{' '}
            {interactions.length} {interactions.length === 1 ? 'moment' : 'moments'} ·{' '}
            {gratitudeList.length}{' '}
            {gratitudeList.length === 1 ? 'gratitude note' : 'gratitude notes'}
          </ThemedText>
        </View>
      </Card>

      {/* Footer */}
      <View style={styles.footer}>
        <ThemedText variant="small" color="textSecondary">
          Keepsake · v{appVersion}
        </ThemedText>
        <ThemedText
          variant="small"
          color="textSecondary"
          style={{ marginTop: spacing.xs / 2 }}
        >
          A quiet place for human connection
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  comingSoonPill: {
    alignSelf: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  permissionBanner: {
    width: '100%',
  },
  statsBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
});
