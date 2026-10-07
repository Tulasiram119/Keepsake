import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from './avatar';
import { TextField } from './text-field';
import { ThemedText } from './themed-text';
import { useTheme } from '@/theme/use-theme';
import type { Friend, ID } from '@/types/models';

export interface FriendPickerProps {
  friends: Friend[];
  selected: ID[];
  onChange: (ids: ID[]) => void;
  multiple?: boolean;
}

export function FriendPicker({
  friends,
  selected,
  onChange,
  multiple = false,
}: FriendPickerProps) {
  const { colors, radius, spacing } = useTheme();
  const [query, setQuery] = useState('');

  const activeFriends = useMemo(
    () => friends.filter((f) => !f.archived),
    [friends],
  );

  const displayedFriends = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeFriends;
    return activeFriends.filter((f) => f.name.toLowerCase().includes(q));
  }, [activeFriends, query]);

  const handleToggle = (id: ID) => {
    if (multiple) {
      if (selected.includes(id)) {
        onChange(selected.filter((x) => x !== id));
      } else {
        onChange([...selected, id]);
      }
    } else {
      if (selected.includes(id)) {
        onChange([]);
      } else {
        onChange([id]);
      }
    }
  };

  return (
    <View style={styles.container}>
      {activeFriends.length > 8 ? (
        <TextField
          label=""
          value={query}
          onChangeText={setQuery}
          placeholder="Filter friends..."
        />
      ) : null}

      <View style={[styles.chipsWrap, { gap: spacing.xs }]}>
        {displayedFriends.map((f) => {
          const isSelected = selected.includes(f.id);
          return (
            <Pressable
              key={f.id}
              onPress={() => handleToggle(f.id)}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderRadius: radius.pill,
                  backgroundColor: isSelected
                    ? colors.primarySoft
                    : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.sm + 2,
                },
                pressed && styles.pressed,
              ]}
            >
              <Avatar name={f.name} photoUri={f.photoUri} size={24} />
              <ThemedText
                variant="smallStrong"
                color={isSelected ? 'primary' : 'text'}
                style={{ marginLeft: spacing.xs }}
              >
                {f.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  chip: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
