import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { useTheme } from '@/theme/use-theme';
import type { Interaction } from '@/types/models';
import { formatDay } from '@/utils/dates';
import { INTERACTION_META } from '@/utils/interaction-meta';

export interface TimelineItemProps {
  interaction: Interaction;
  now: Date;
  onPress?: () => void;
}

export function TimelineItem({
  interaction,
  now,
  onPress,
}: TimelineItemProps) {
  const { colors, radius, spacing } = useTheme();
  const meta = INTERACTION_META[interaction.type];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.sm,
        },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: colors.surfaceAlt,
            borderRadius: radius.pill,
            marginRight: spacing.md,
          },
        ]}
      >
        <Ionicons name={meta.icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <ThemedText variant="bodyStrong">{meta.past}</ThemedText>
          <ThemedText variant="small" color="textSecondary">
            {formatDay(interaction.date, now)}
          </ThemedText>
        </View>
        {interaction.note ? (
          <ThemedText
            variant="body"
            color="textSecondary"
            style={{ marginTop: spacing.xs }}
          >
            {interaction.note}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.85,
  },
});
