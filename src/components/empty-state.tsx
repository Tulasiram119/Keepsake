import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Button } from './button';
import { ThemedText } from './themed-text';
import { useTheme } from '@/theme/use-theme';
import type { IconName } from '@/utils/interaction-meta';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={[styles.container, { paddingVertical: spacing.xxl }]}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: colors.surfaceAlt,
            borderRadius: radius.pill,
            marginBottom: spacing.md,
          },
        ]}
      >
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>
      <ThemedText variant="heading" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText
        variant="body"
        color="textSecondary"
        style={[styles.message, { marginTop: spacing.xs, marginBottom: spacing.lg }]}
      >
        {message}
      </ThemedText>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="primary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    maxWidth: 320,
  },
});
