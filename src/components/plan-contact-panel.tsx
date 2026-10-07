import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from './button';
import { Card } from './card';
import { Chip } from './chip';
import { DateField } from './date-field';
import { ThemedText } from './themed-text';
import { appActions } from '@/store/hooks';
import { useTheme } from '@/theme/use-theme';
import type { Friend, InteractionType } from '@/types/models';
import { atDayOffset } from '@/utils/dates';
import { INTERACTION_META, INTERACTION_TYPES } from '@/utils/interaction-meta';

export interface PlanContactPanelProps {
  friend: Friend;
  onDone: () => void;
}

export function PlanContactPanel({ friend, onDone }: PlanContactPanelProps) {
  const { spacing } = useTheme();

  const [type, setType] = useState<InteractionType>(
    friend.nextPlanned?.type ?? 'called',
  );

  const defaultDate =
    friend.nextPlanned?.at ?? atDayOffset(new Date(), 1, 18); // Default: tomorrow 6pm
  const [at, setAt] = useState<string>(defaultDate);

  const handleSave = () => {
    appActions().setPlannedContact(friend.id, {
      at,
      type,
    });
    onDone();
  };

  const handleClear = () => {
    appActions().setPlannedContact(friend.id, undefined);
    onDone();
  };

  return (
    <Card tone="surface" style={styles.container}>
      <ThemedText variant="subheading" style={{ marginBottom: spacing.md }}>
        Plan next contact with {friend.name}
      </ThemedText>

      {/* Type selection */}
      <View style={{ marginBottom: spacing.md }}>
        <ThemedText
          variant="smallStrong"
          color="textSecondary"
          style={{ marginBottom: spacing.xs }}
        >
          How will you connect?
        </ThemedText>
        <View style={[styles.chipsRow, { gap: spacing.xs }]}>
          {INTERACTION_TYPES.map((t) => {
            const meta = INTERACTION_META[t];
            return (
              <Chip
                key={t}
                label={meta.label}
                icon={meta.icon}
                selected={type === t}
                onPress={() => setType(t)}
              />
            );
          })}
        </View>
      </View>

      {/* Date & Time selection */}
      <DateField
        label="When"
        value={at}
        onChange={setAt}
        mode="future"
        withTime
      />

      <View style={[styles.buttonsRow, { marginTop: spacing.md, gap: spacing.sm }]}>
        <Button label="Save plan" onPress={handleSave} variant="primary" />
        {friend.nextPlanned ? (
          <Button label="Clear plan" onPress={handleClear} variant="danger" />
        ) : null}
        <Button label="Cancel" onPress={onDone} variant="ghost" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  buttonsRow: {
    flexDirection: 'column',
  },
});
