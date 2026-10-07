import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/button";
import { Chip } from "@/components/chip";
import { DateField } from "@/components/date-field";
import { FriendPicker } from "@/components/friend-picker";
import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { TextField } from "@/components/text-field";
import { ThemedText } from "@/components/themed-text";
import { appActions, useFriends, useGratitude } from "@/store/hooks";
import { useTheme } from "@/theme/use-theme";
import type { ID } from "@/types/models";
import { confirm } from "@/utils/confirm";

const GRATITUDE_TAGS = [
  "health",
  "work",
  "family",
  "friends",
  "nature",
  "small joys",
] as const;

const PLACEHOLDERS = [
  "What made you smile today?",
  "Who helped you recently?",
  "A small moment worth keeping…",
];

export default function AddGratitudeModal() {
  const { friendId, entryId } = useLocalSearchParams<{
    friendId?: string;
    entryId?: string;
  }>();

  const friends = useFriends();
  const gratitudeList = useGratitude();
  const { spacing } = useTheme();

  const existingEntry = gratitudeList.find((g) => g.id === entryId);
  const isEditing = Boolean(entryId && existingEntry);

  const initialFriendIds = useMemo(() => {
    if (existingEntry) return existingEntry.friendIds;
    if (friendId) return [friendId];
    return [];
  }, [existingEntry, friendId]);

  const placeholder = useMemo(
    () => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)],
    [],
  );

  const [text, setText] = useState<string>(existingEntry?.text ?? "");
  const [date, setDate] = useState<string>(
    existingEntry?.date ?? new Date().toISOString(),
  );
  const [selectedFriendIds, setSelectedFriendIds] =
    useState<ID[]>(initialFriendIds);
  const [tag, setTag] = useState<string | undefined>(existingEntry?.tag);

  const canSave = text.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;

    const data = {
      text: text.trim(),
      date,
      friendIds: selectedFriendIds,
      tag: tag || undefined,
    };

    if (isEditing && entryId) {
      appActions().updateGratitude(entryId, data);
    } else {
      appActions().addGratitude(data);
    }
    router.back();
  };

  const handleDelete = async () => {
    if (!entryId) return;
    const ok = await confirm({
      title: "Delete gratitude note?",
      message: "This gratitude note will be removed from your journal.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (ok) {
      appActions().deleteGratitude(entryId);
      router.back();
    }
  };

  const handleTagToggle = (t: string) => {
    setTag((prev) => (prev === t ? undefined : t));
  };

  return (
    <Screen scroll padded>
      <ScreenHeader
        title={isEditing ? "Edit gratitude" : "Gratitude note"}
        subtitle="Notice the good, big or small"
      />

      {/* Note Text */}
      <TextField
        label="What are you grateful for? *"
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        multiline
        numberOfLines={4}
        autoFocus={!isEditing}
        style={styles.textArea}
      />

      {/* Date */}
      <DateField label="Date" value={date} onChange={setDate} mode="past" />

      {/* Linked Friends */}
      <View style={{ marginBottom: spacing.lg }}>
        <ThemedText
          variant="smallStrong"
          color="textSecondary"
          style={{ marginBottom: spacing.xs }}
        >
          Linked to
        </ThemedText>
        <ThemedText
          variant="small"
          color="textSecondary"
          style={{ marginBottom: spacing.sm }}
        >
          Leave empty for general gratitude (life, situations, moments)
        </ThemedText>
        {friends.length > 0 ? (
          <FriendPicker
            friends={friends}
            selected={selectedFriendIds}
            onChange={setSelectedFriendIds}
            multiple
          />
        ) : (
          <ThemedText variant="small" color="textSecondary">
            No friends added yet.
          </ThemedText>
        )}
      </View>

      {/* Tags */}
      <View style={{ marginBottom: spacing.lg }}>
        <ThemedText
          variant="smallStrong"
          color="textSecondary"
          style={{ marginBottom: spacing.xs }}
        >
          Category tag
        </ThemedText>
        <View style={[styles.chipsRow, { gap: spacing.xs }]}>
          {GRATITUDE_TAGS.map((t) => (
            <Chip
              key={t}
              label={`#${t}`}
              selected={tag === t}
              onPress={() => handleTagToggle(t)}
            />
          ))}
        </View>
      </View>

      <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
        <Button
          label={isEditing ? "Save changes" : "Save note"}
          onPress={handleSave}
          disabled={!canSave}
          variant="primary"
        />

        {isEditing ? (
          <Button label="Delete note" onPress={handleDelete} variant="danger" />
        ) : null}

        <Button label="Cancel" onPress={() => router.back()} variant="ghost" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
});
