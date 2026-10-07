import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { useTheme } from '@/theme/use-theme';
import type { Friend, GratitudeEntry } from '@/types/models';
import { formatDay } from '@/utils/dates';

export interface GratitudeCardProps {
  entry: GratitudeEntry;
  friends: Friend[];
  now: Date;
  onPress?: () => void;
}

export function GratitudeCard({
  entry,
  friends,
  now,
  onPress,
}: GratitudeCardProps) {
  const { colors, fonts, radius, spacing, typeScale } = useTheme();

  const linkedNames =
    entry.friendIds.length === 0
      ? 'Life'
      : friends
          .filter((f) => entry.friendIds.includes(f.id))
          .map((f) => f.name)
          .join(', ') || 'Friends';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderLeftColor: colors.accent,
          borderLeftWidth: 4,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.sm,
        },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        style={[
          styles.quote,
          {
            fontFamily: fonts.displayItalic,
            fontSize: typeScale.body + 1,
            color: colors.text,
            marginBottom: spacing.sm,
          },
        ]}
      >
        "{entry.text}"
      </ThemedText>

      <View style={styles.footerRow}>
        <View style={styles.leftMeta}>
          <ThemedText
            variant="smallStrong"
            color="accent"
            style={{ marginRight: spacing.sm }}
          >
            {linkedNames}
          </ThemedText>
          {entry.tag ? (
            <View
              style={[
                styles.tagChip,
                {
                  backgroundColor: colors.accentSoft,
                  borderRadius: radius.pill,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 2,
                },
              ]}
            >
              <ThemedText variant="small" color="textSecondary">
                #{entry.tag}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <ThemedText variant="small" color="textSecondary">
          {formatDay(entry.date, now)}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  quote: {
    lineHeight: 24,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  tagChip: {
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
