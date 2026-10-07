import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from './avatar';
import { Card } from './card';
import { StatusPill } from './status-pill';
import { ThemedText } from './themed-text';
import { useTheme } from '@/theme/use-theme';
import { formatDayTime } from '@/utils/dates';
import { type DashboardEntry, formatLastContact, statusMessage } from '@/utils/derived';
import { INTERACTION_META } from '@/utils/interaction-meta';

export interface FriendCardProps {
  entry: DashboardEntry;
  now: Date;
  onPress: () => void;
  onLog: () => void;
  onCall?: () => void;
  onGratitude: () => void;
}

export function FriendCard({
  entry,
  now,
  onPress,
  onLog,
  onCall,
  onGratitude,
}: FriendCardProps) {
  const { colors, fonts, radius, spacing } = useTheme();
  const { friend, last, status, daysUntilDue, latestGratitude } = entry;

  const isOverdue = status === 'overdue';
  const gentle = statusMessage(entry);

  return (
    <Card
      tone={isOverdue ? 'warning' : 'surface'}
      onPress={onPress}
      style={[
        styles.card,
        isOverdue && { borderColor: colors.warning },
      ]}
    >
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <Avatar name={friend.name} photoUri={friend.photoUri} size={48} />
        <View style={[styles.nameCol, { marginLeft: spacing.md }]}>
          <ThemedText variant="subheading">{friend.name}</ThemedText>
          {friend.group ? (
            <ThemedText variant="small" color="textSecondary">
              {friend.group}
            </ThemedText>
          ) : null}
        </View>
        <StatusPill status={status} daysUntilDue={daysUntilDue} />
      </View>

      {/* Gentle Status Message */}
      {gentle ? (
        <ThemedText
          variant="smallStrong"
          color={isOverdue ? 'warning' : 'primary'}
          style={{ marginTop: spacing.sm }}
        >
          {gentle}
        </ThemedText>
      ) : null}

      {/* Last Contact */}
      <View style={[styles.metaRow, { marginTop: spacing.sm }]}>
        <Ionicons
          name={last ? INTERACTION_META[last.type].icon : 'time-outline'}
          size={16}
          color={colors.textSecondary}
          style={{ marginRight: spacing.xs }}
        />
        <ThemedText variant="small" color="textSecondary">
          {formatLastContact(last, now)}
        </ThemedText>
      </View>

      {/* Next Planned */}
      {friend.nextPlanned ? (
        <View style={[styles.metaRow, { marginTop: spacing.xs / 2 }]}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={colors.primary}
            style={{ marginRight: spacing.xs }}
          />
          <ThemedText variant="small" color="primary">
            Planned: {INTERACTION_META[friend.nextPlanned.type].label} ·{' '}
            {formatDayTime(friend.nextPlanned.at, now)}
          </ThemedText>
        </View>
      ) : null}

      {/* Latest Gratitude Quote */}
      {latestGratitude ? (
        <View
          style={[
            styles.gratitudeQuote,
            {
              borderLeftColor: colors.accent,
              backgroundColor: colors.surfaceAlt,
              borderRadius: radius.sm,
              marginTop: spacing.md,
              padding: spacing.sm,
            },
          ]}
        >
          <ThemedText
            numberOfLines={2}
            style={{
              fontFamily: fonts.displayItalic,
              color: colors.text,
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            "{latestGratitude.text}"
          </ThemedText>
        </View>
      ) : null}

      {/* Quick Action Buttons */}
      <View style={[styles.actionsRow, { marginTop: spacing.md, gap: spacing.sm }]}>
        <Pressable
          onPress={onLog}
          style={({ pressed }) => [
            styles.actionPill,
            {
              backgroundColor: colors.primarySoft,
              borderColor: colors.primary,
              borderRadius: radius.pill,
            },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="cafe-outline"
            size={16}
            color={colors.primary}
            style={{ marginRight: spacing.xs }}
          />
          <ThemedText variant="smallStrong" color="primary">
            Log
          </ThemedText>
        </Pressable>

        {onCall ? (
          <Pressable
            onPress={onCall}
            style={({ pressed }) => [
              styles.actionPill,
              {
                backgroundColor: colors.secondarySoft,
                borderColor: colors.secondary,
                borderRadius: radius.pill,
              },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="call-outline"
              size={16}
              color={colors.text}
              style={{ marginRight: spacing.xs }}
            />
            <ThemedText variant="smallStrong" color="text">
              Call
            </ThemedText>
          </Pressable>
        ) : null}

        <Pressable
          onPress={onGratitude}
          style={({ pressed }) => [
            styles.actionPill,
            {
              backgroundColor: colors.accentSoft,
              borderColor: colors.accent,
              borderRadius: radius.pill,
            },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="heart-outline"
            size={16}
            color={colors.accent}
            style={{ marginRight: spacing.xs }}
          />
          <ThemedText variant="smallStrong" color="accent">
            Gratitude
          </ThemedText>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameCol: {
    flex: 1,
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gratitudeQuote: {
    borderLeftWidth: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionPill: {
    minHeight: 44,
    minWidth: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.8,
  },
});
