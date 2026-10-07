import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/button';
import { DateField } from '@/components/date-field';
import { EmptyState } from '@/components/empty-state';
import { FriendPicker } from '@/components/friend-picker';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import {
  appActions,
  useFriend,
  useFriends,
  useInteractions,
} from '@/store/hooks';
import { useTheme } from '@/theme/use-theme';
import type { ID, InteractionType } from '@/types/models';
import { confirm } from '@/utils/confirm';
import { INTERACTION_META, INTERACTION_TYPES } from '@/utils/interaction-meta';

export default function LogInteractionModal() {
  const { friendId, interactionId } = useLocalSearchParams<{
    friendId?: string;
    interactionId?: string;
  }>();

  const friends = useFriends();
  const interactions = useInteractions();
  const { colors, radius, spacing } = useTheme();

  const existingInteraction = interactions.find((i) => i.id === interactionId);
  const isEditing = Boolean(interactionId && existingInteraction);

  const initialFriendId = existingInteraction?.friendId ?? friendId;
  const lockedFriend = useFriend(initialFriendId);

  const [selectedFriendIds, setSelectedFriendIds] = useState<ID[]>(
    initialFriendId ? [initialFriendId] : [],
  );

  const [type, setType] = useState<InteractionType>(
    existingInteraction?.type ?? 'called',
  );
  const [date, setDate] = useState<string>(
    existingInteraction?.date ?? new Date().toISOString(),
  );
  const [note, setNote] = useState<string>(existingInteraction?.note ?? '');

  if (friends.length === 0) {
    return (
      <Screen padded>
        <EmptyState
          icon="people-outline"
          title="No friends yet"
          message="Add someone to your friend list before logging a moment."
          actionLabel="Add a friend"
          onAction={() => router.replace('/friend/edit')}
        />
      </Screen>
    );
  }

  const effectiveFriendId = isEditing
    ? existingInteraction?.friendId
    : selectedFriendIds[0];

  const canSave = Boolean(effectiveFriendId);

  const handleSave = () => {
    if (!effectiveFriendId) return;

    if (isEditing && interactionId) {
      appActions().updateInteraction(interactionId, {
        type,
        date,
        note: note.trim() || undefined,
      });
    } else {
      appActions().logInteraction({
        friendId: effectiveFriendId,
        type,
        date,
        note: note.trim() || undefined,
      });
    }
    router.back();
  };

  const handleDelete = async () => {
    if (!interactionId) return;
    const ok = await confirm({
      title: 'Delete this moment?',
      message: 'This log entry will be permanently removed.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) {
      appActions().deleteInteraction(interactionId);
      router.back();
    }
  };

  return (
    <Screen scroll padded>
      <ScreenHeader
        title={isEditing ? 'Edit moment' : 'Log a moment'}
        subtitle={
          lockedFriend
            ? `With ${lockedFriend.name}`
            : 'Keep the memory fresh'
        }
      />

      {/* Friend selection (if not already locked) */}
      {!lockedFriend ? (
        <View style={{ marginBottom: spacing.lg }}>
          <ThemedText
            variant="smallStrong"
            color="textSecondary"
            style={{ marginBottom: spacing.xs }}
          >
            Who did you connect with? *
          </ThemedText>
          <FriendPicker
            friends={friends}
            selected={selectedFriendIds}
            onChange={setSelectedFriendIds}
            multiple={false}
          />
        </View>
      ) : null}

      {/* Interaction Type Tiles */}
      <View style={{ marginBottom: spacing.lg }}>
        <ThemedText
          variant="smallStrong"
          color="textSecondary"
          style={{ marginBottom: spacing.xs }}
        >
          How did you connect?
        </ThemedText>
        <View style={[styles.typesGrid, { gap: spacing.sm }]}>
          {INTERACTION_TYPES.map((t) => {
            const meta = INTERACTION_META[t];
            const isSelected = type === t;
            return (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                style={({ pressed }) => [
                  styles.typeTile,
                  {
                    backgroundColor: isSelected
                      ? colors.primarySoft
                      : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderRadius: radius.md,
                    padding: spacing.md,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name={meta.icon}
                  size={24}
                  color={isSelected ? colors.primary : colors.text}
                />
                <ThemedText
                  variant="bodyStrong"
                  color={isSelected ? 'primary' : 'text'}
                  style={{ marginTop: spacing.xs }}
                >
                  {meta.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* When (Date Field) */}
      <DateField
        label="When did this happen?"
        value={date}
        onChange={setDate}
        mode="past"
      />

      {/* Note Field */}
      <TextField
        label="Anything to remember?"
        value={note}
        onChangeText={setNote}
        placeholder="Shared updates, book recommendation, inside joke..."
        multiline
        numberOfLines={3}
      />

      <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
        <Button
          label={isEditing ? 'Save changes' : 'Save moment'}
          onPress={handleSave}
          disabled={!canSave}
          variant="primary"
        />

        {isEditing ? (
          <Button
            label="Delete moment"
            onPress={handleDelete}
            variant="danger"
          />
        ) : null}

        <Button label="Cancel" onPress={() => router.back()} variant="ghost" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  typeTile: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 80,
  },
  pressed: {
    opacity: 0.85,
  },
});
