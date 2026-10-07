import Constants from 'expo-constants';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import {
  appActions,
  useFriends,
  useGratitude,
  useInteractions,
  useSettings,
} from '@/store/hooks';
import { useTheme } from '@/theme/use-theme';
import type { ThemePreference } from '@/types/models';

export default function SettingsScreen() {
  const settings = useSettings();
  const friends = useFriends();
  const interactions = useInteractions();
  const gratitudeList = useGratitude();
  const { colors, radius, spacing } = useTheme();

  const handleThemeChange = (t: ThemePreference) => {
    appActions().updateSettings({ theme: t });
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen scroll padded>
      <ScreenHeader
        eyebrow="Preferences"
        title="Settings"
        subtitle="Theme and storage"
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
        <View style={styles.cardHeaderRow}>
          <ThemedText variant="subheading">Reminders</ThemedText>
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
          style={{ marginTop: spacing.xs }}
        >
          Gentle nudges when it's been a while, planned-call alerts, and an
          optional daily gratitude prompt.
        </ThemedText>
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
