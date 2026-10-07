import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { useTheme } from '@/theme/use-theme';
import type { ContactStatus } from '@/utils/derived';
import { relativeDays } from '@/utils/dates';

export interface StatusPillProps {
  status: ContactStatus;
  daysUntilDue?: number;
}

export function StatusPill({ status, daysUntilDue }: StatusPillProps) {
  const { colors, radius, spacing } = useTheme();

  if (status === 'none') return null;

  let bg = colors.surface;
  let textColor: keyof typeof colors = 'textSecondary';
  let label = '';

  if (status === 'overdue') {
    bg = colors.warningSoft;
    textColor = 'warning';
    label = "It's been a while";
  } else if (status === 'soon') {
    bg = colors.secondarySoft;
    textColor = 'text';
    const d = daysUntilDue ?? 0;
    label = d === 0 ? 'Due today' : d === 1 ? 'Due tomorrow' : `Due in ${d} days`;
  } else if (status === 'ok') {
    bg = colors.successSoft;
    textColor = 'success';
    label = 'On track';
  }

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: bg,
          borderRadius: radius.pill,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
        },
      ]}
    >
      <ThemedText variant="smallStrong" color={textColor}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
