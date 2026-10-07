import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from './avatar';
import { ThemedText } from './themed-text';
import { useTheme } from '@/theme/use-theme';
import type { Friend, Interaction } from '@/types/models';
import { formatLastContact } from '@/utils/derived';

export interface FriendRowProps {
  friend: Friend;
  last?: Interaction;
  now: Date;
  onPress: () => void;
}

export function FriendRow({ friend, last, now, onPress }: FriendRowProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
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
      <Avatar name={friend.name} photoUri={friend.photoUri} size={46} />
      <View style={[styles.info, { marginLeft: spacing.md }]}>
        <View style={styles.nameRow}>
          <ThemedText variant="bodyStrong">{friend.name}</ThemedText>
          {friend.archived ? (
            <ThemedText
              variant="small"
              color="textSecondary"
              style={{ marginLeft: spacing.xs }}
            >
              (Archived)
            </ThemedText>
          ) : null}
        </View>
        <ThemedText variant="small" color="textSecondary" numberOfLines={1}>
          {friend.group ? `${friend.group} · ` : ''}
          {formatLastContact(last, now)}
        </ThemedText>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.textSecondary}
        style={{ marginLeft: spacing.xs }}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
});
