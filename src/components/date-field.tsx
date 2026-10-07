import { StyleSheet, View } from 'react-native';
import { parseISO } from 'date-fns';

import { Chip } from './chip';
import { IconButton } from './icon-button';
import { ThemedText } from './themed-text';
import { useTheme } from '@/theme/use-theme';
import type { ISODate } from '@/types/models';
import {
  atDayOffset,
  daysSince,
  formatDay,
  formatDayTime,
  setHour,
  shiftDays,
} from '@/utils/dates';

export interface DateFieldProps {
  label: string;
  value: ISODate;
  onChange: (v: ISODate) => void;
  mode: 'past' | 'future';
  withTime?: boolean;
}

export function DateField({
  label,
  value,
  onChange,
  mode,
  withTime = false,
}: DateFieldProps) {
  const { colors, radius, spacing } = useTheme();
  const now = new Date();

  const handlePrevDay = () => {
    onChange(shiftDays(value, -1));
  };

  const handleNextDay = () => {
    const next = shiftDays(value, 1);
    if (mode === 'past' && daysSince(next, now) < 0) {
      return; // Can't go into the future in past mode
    }
    onChange(next);
  };

  const isNextDisabled = mode === 'past' && daysSince(shiftDays(value, 1), now) < 0;

  const currentHour = parseISO(value).getHours();

  return (
    <View style={[styles.container, { marginBottom: spacing.md }]}>
      <ThemedText
        variant="smallStrong"
        color="textSecondary"
        style={{ marginBottom: spacing.xs }}
      >
        {label}
      </ThemedText>

      {/* Date Stepper Display */}
      <View
        style={[
          styles.stepperRow,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.sm,
            padding: spacing.xs,
          },
        ]}
      >
        <IconButton
          icon="chevron-back"
          accessibilityLabel="Previous day"
          onPress={handlePrevDay}
          size={18}
          tone="neutral"
        />
        <ThemedText variant="bodyStrong" style={styles.dateText}>
          {withTime ? formatDayTime(value, now) : formatDay(value, now)}
        </ThemedText>
        <IconButton
          icon="chevron-forward"
          accessibilityLabel="Next day"
          onPress={handleNextDay}
          disabled={isNextDisabled}
          size={18}
          tone="neutral"
        />
      </View>

      {/* Quick Chips */}
      <View style={[styles.chipsRow, { marginTop: spacing.sm, gap: spacing.xs }]}>
        {mode === 'past' ? (
          <>
            <Chip
              label="Today"
              selected={daysSince(value, now) === 0}
              onPress={() => onChange(atDayOffset(now, 0, withTime ? currentHour : undefined))}
            />
            <Chip
              label="Yesterday"
              selected={daysSince(value, now) === 1}
              onPress={() => onChange(atDayOffset(now, -1, withTime ? currentHour : undefined))}
            />
            <Chip
              label="2 days ago"
              selected={daysSince(value, now) === 2}
              onPress={() => onChange(atDayOffset(now, -2, withTime ? currentHour : undefined))}
            />
          </>
        ) : (
          <>
            <Chip
              label="Tomorrow"
              selected={daysSince(value, now) === -1}
              onPress={() => onChange(atDayOffset(now, 1, withTime ? currentHour : undefined))}
            />
            <Chip
              label="In 3 days"
              selected={daysSince(value, now) === -3}
              onPress={() => onChange(atDayOffset(now, 3, withTime ? currentHour : undefined))}
            />
            <Chip
              label="Next week"
              selected={daysSince(value, now) === -7}
              onPress={() => onChange(atDayOffset(now, 7, withTime ? currentHour : undefined))}
            />
          </>
        )}
      </View>

      {/* Hour Row when withTime is true */}
      {withTime ? (
        <View style={[styles.chipsRow, { marginTop: spacing.sm, gap: spacing.xs }]}>
          <Chip
            label="Morning 9am"
            selected={currentHour === 9}
            onPress={() => onChange(setHour(value, 9))}
          />
          <Chip
            label="Noon 12pm"
            selected={currentHour === 12}
            onPress={() => onChange(setHour(value, 12))}
          />
          <Chip
            label="Evening 6pm"
            selected={currentHour === 18}
            onPress={() => onChange(setHour(value, 18))}
          />
          <Chip
            label="Night 8pm"
            selected={currentHour === 20}
            onPress={() => onChange(setHour(value, 20))}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  dateText: {
    flex: 1,
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
});
