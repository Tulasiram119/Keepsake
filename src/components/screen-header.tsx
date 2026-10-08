import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { useTheme } from '@/theme/use-theme';

export interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function ScreenHeader({ eyebrow, title, subtitle, right }: ScreenHeaderProps) {
  const { colors, fonts, spacing } = useTheme();

  return (
    <View style={[styles.container, { marginBottom: spacing.md }]}>
      <View style={styles.textColumn}>
        {eyebrow ? (
          <ThemedText
            style={[
              styles.eyebrow,
              {
                color: colors.primary,
                fontFamily: fonts.bodyBold,
                marginBottom: spacing.xs,
              },
            ]}
          >
            {eyebrow}
          </ThemedText>
        ) : null}
        <ThemedText variant="title">{title}</ThemedText>
        {subtitle ? (
          <ThemedText
            variant="small"
            color="textSecondary"
            style={{ marginTop: spacing.xs / 2 }}
          >
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  right: {
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
