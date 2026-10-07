import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { useTheme } from '@/theme/use-theme';

export interface SectionTitleProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionTitle({
  title,
  actionLabel,
  onAction,
}: SectionTitleProps) {
  const { spacing } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          marginTop: spacing.lg,
          marginBottom: spacing.sm,
        },
      ]}
    >
      <ThemedText variant="subheading">{title}</ThemedText>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <ThemedText variant="smallStrong" color="primary">
            {actionLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
