import { useState } from 'react';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { IconButton } from '@/components/icon-button';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import {
  clearStagedBackup,
  exportBackupAsync,
  getStagedBackup,
} from '@/services/backup';
import { syncAllNotifications } from '@/services/notifications';
import { useAppStore } from '@/store';
import {
  appActions,
  useFriends,
  useGratitude,
  useInteractions,
} from '@/store/hooks';
import { useTheme } from '@/theme/use-theme';

export default function ImportPreviewScreen() {
  const staged = getStagedBackup();
  const currentFriends = useFriends();
  const currentInteractions = useInteractions();
  const currentGratitude = useGratitude();
  const { colors, radius, spacing } = useTheme();

  const [isProcessing, setIsProcessing] = useState(false);

  if (!staged) {
    return (
      <Screen scroll padded>
        <ScreenHeader
          eyebrow="Restore"
          title="Backup Preview"
          right={
            <IconButton
              icon="close-outline"
              accessibilityLabel="Close"
              onPress={() => router.back()}
            />
          }
        />
        <Card tone="surface" style={[styles.card, { padding: spacing.lg }]}>
          <ThemedText variant="body" color="textSecondary" style={{ textAlign: 'center' }}>
            No backup file has been selected yet.
          </ThemedText>
          <Button
            label="Return to Settings"
            variant="secondary"
            onPress={() => router.back()}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      </Screen>
    );
  }

  // Calculate incoming diff counts
  const incomingFriends = staged.data.friends ?? [];
  const incomingInteractions = staged.data.interactions ?? [];
  const incomingGratitude = staged.data.gratitude ?? [];

  const existingFriendIds = new Set(currentFriends.map((f) => f.id));
  const newFriendsCount = incomingFriends.filter((f) => !existingFriendIds.has(f.id)).length;
  const updatedFriendsCount = incomingFriends.length - newFriendsCount;

  const existingInteractionIds = new Set(currentInteractions.map((i) => i.id));
  const newInteractionsCount = incomingInteractions.filter(
    (i) => !existingInteractionIds.has(i.id),
  ).length;
  const updatedInteractionsCount = incomingInteractions.length - newInteractionsCount;

  const existingGratitudeIds = new Set(currentGratitude.map((g) => g.id));
  const newGratitudeCount = incomingGratitude.filter(
    (g) => !existingGratitudeIds.has(g.id),
  ).length;
  const updatedGratitudeCount = incomingGratitude.length - newGratitudeCount;

  let formattedDate = 'Unknown date';
  try {
    formattedDate = format(new Date(staged.exportedAt), "MMMM d, yyyy 'at' h:mm a");
  } catch {
    formattedDate = staged.exportedAt;
  }

  const handleMerge = () => {
    setIsProcessing(true);
    try {
      const summary = appActions().importBackup(staged, 'merge');
      if (Platform.OS !== 'web') {
        void syncAllNotifications(useAppStore.getState());
      }
      clearStagedBackup();

      Alert.alert(
        'Import Successful',
        `Merged ${summary.friendsAdded} new friends (${summary.friendsUpdated} updated) and ${summary.interactionsAdded} moments.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (err) {
      Alert.alert('Import Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeReplace = () => {
    setIsProcessing(true);
    try {
      const summary = appActions().importBackup(staged, 'replace');
      if (Platform.OS !== 'web') {
        void syncAllNotifications(useAppStore.getState());
      }
      clearStagedBackup();

      Alert.alert(
        'Restore Complete',
        `Replaced all data with backup (${summary.friendsAdded} friends, ${summary.interactionsAdded} moments).`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (err) {
      Alert.alert('Restore Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReplace = () => {
    if (Platform.OS === 'web') {
      const proceed = window.confirm(
        'Are you sure you want to replace all existing data with this backup? Current records will be overwritten.',
      );
      if (proceed) {
        executeReplace();
      }
      return;
    }

    Alert.alert(
      'Replace All Data?',
      'This will replace all existing friends, moments, and gratitude entries. Would you like to export a safety backup of your current data first?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save Backup First',
          onPress: async () => {
            await exportBackupAsync();
            executeReplace();
          },
        },
        {
          text: 'Replace All',
          style: 'destructive',
          onPress: executeReplace,
        },
      ],
    );
  };

  const handleCancel = () => {
    clearStagedBackup();
    router.back();
  };

  return (
    <Screen scroll padded>
      <ScreenHeader
        eyebrow="Restore Backup"
        title="Backup Preview"
        subtitle={`Exported on ${formattedDate}`}
        right={
          <IconButton
            icon="close-outline"
            accessibilityLabel="Close"
            onPress={handleCancel}
          />
        }
      />

      {/* Summary Card */}
      <Card tone="surface" style={[styles.card, { marginBottom: spacing.lg }]}>
        <ThemedText variant="subheading" style={{ marginBottom: spacing.xs }}>
          Backup Contents
        </ThemedText>
        <ThemedText variant="small" color="textSecondary" style={{ marginBottom: spacing.md }}>
          Review the records contained in this backup before deciding how to proceed.
        </ThemedText>

        <View style={styles.statsList}>
          {/* Friends stat */}
          <View
            style={[
              styles.statRow,
              {
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.sm,
                padding: spacing.md,
                marginBottom: spacing.sm,
              },
            ]}
          >
            <View>
              <ThemedText variant="bodyStrong">
                {incomingFriends.length}{' '}
                {incomingFriends.length === 1 ? 'Friend' : 'Friends'}
              </ThemedText>
              <ThemedText variant="small" color="textSecondary">
                {newFriendsCount} new · {updatedFriendsCount} existing
              </ThemedText>
            </View>
            <ThemedText variant="small" color="textSecondary">
              Device: {currentFriends.length}
            </ThemedText>
          </View>

          {/* Moments stat */}
          <View
            style={[
              styles.statRow,
              {
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.sm,
                padding: spacing.md,
                marginBottom: spacing.sm,
              },
            ]}
          >
            <View>
              <ThemedText variant="bodyStrong">
                {incomingInteractions.length}{' '}
                {incomingInteractions.length === 1 ? 'Moment' : 'Moments'}
              </ThemedText>
              <ThemedText variant="small" color="textSecondary">
                {newInteractionsCount} new · {updatedInteractionsCount} existing
              </ThemedText>
            </View>
            <ThemedText variant="small" color="textSecondary">
              Device: {currentInteractions.length}
            </ThemedText>
          </View>

          {/* Gratitude stat */}
          <View
            style={[
              styles.statRow,
              {
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.sm,
                padding: spacing.md,
              },
            ]}
          >
            <View>
              <ThemedText variant="bodyStrong">
                {incomingGratitude.length}{' '}
                {incomingGratitude.length === 1 ? 'Gratitude Note' : 'Gratitude Notes'}
              </ThemedText>
              <ThemedText variant="small" color="textSecondary">
                {newGratitudeCount} new · {updatedGratitudeCount} existing
              </ThemedText>
            </View>
            <ThemedText variant="small" color="textSecondary">
              Device: {currentGratitude.length}
            </ThemedText>
          </View>
        </View>
      </Card>

      {/* Action Options Card */}
      <Card tone="surface" style={[styles.card, { marginBottom: spacing.xl }]}>
        <ThemedText variant="subheading" style={{ marginBottom: spacing.xs }}>
          Restore Options
        </ThemedText>
        <ThemedText variant="small" color="textSecondary" style={{ marginBottom: spacing.lg }}>
          Choose how you would like to apply this backup to your phone.
        </ThemedText>

        {/* Merge action */}
        <View style={{ marginBottom: spacing.lg }}>
          <Button
            label="Merge with Existing Data"
            icon="git-merge-outline"
            variant="primary"
            disabled={isProcessing}
            onPress={handleMerge}
          />
          <ThemedText
            variant="small"
            color="textSecondary"
            style={{ marginTop: spacing.xs, textAlign: 'center' }}
          >
            Recommended. Combines backup records without deleting any memories.
          </ThemedText>
        </View>

        {/* Replace action */}
        <View style={{ marginBottom: spacing.sm }}>
          <Button
            label="Replace All Data"
            icon="refresh-outline"
            variant="danger"
            disabled={isProcessing}
            onPress={handleReplace}
          />
          <ThemedText
            variant="small"
            color="textSecondary"
            style={{ marginTop: spacing.xs, textAlign: 'center' }}
          >
            Overwrites current device data with this backup file.
          </ThemedText>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  statsList: {
    width: '100%',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
