import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { appActions, useFriend, useFriends } from '@/store/hooks';
import { useTheme } from '@/theme/use-theme';
import { confirm } from '@/utils/confirm';
import { isValidBirthday } from '@/utils/dates';
import { collectGroups } from '@/utils/derived';

export default function FriendEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const friends = useFriends();
  const existing = useFriend(id);
  const { spacing } = useTheme();

  const isEditing = Boolean(id && existing);

  const [name, setName] = useState(existing?.name ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [birthday, setBirthday] = useState(existing?.birthday ?? '');
  const [group, setGroup] = useState(existing?.group ?? '');
  const [howWeMet, setHowWeMet] = useState(existing?.howWeMet ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const existingRepeat = existing?.repeatEveryDays;
  const initialChip =
    existingRepeat === undefined
      ? 'none'
      : [7, 14, 30].includes(existingRepeat)
        ? String(existingRepeat)
        : 'custom';

  const [repeatMode, setRepeatMode] = useState<string>(initialChip);
  const [customDays, setCustomDays] = useState<string>(
    initialChip === 'custom' && existingRepeat ? String(existingRepeat) : '',
  );

  const existingGroups = collectGroups(friends);

  // Validation
  const trimmedName = name.trim();
  const birthdayTrimmed = birthday.trim();
  const birthdayError =
    birthdayTrimmed.length > 0 && !isValidBirthday(birthdayTrimmed)
      ? 'Use MM-DD or YYYY-MM-DD'
      : undefined;

  let repeatDaysVal: number | undefined;
  let customDaysError: string | undefined;

  if (repeatMode === 'none') {
    repeatDaysVal = undefined;
  } else if (['7', '14', '30'].includes(repeatMode)) {
    repeatDaysVal = Number(repeatMode);
  } else if (repeatMode === 'custom') {
    const parsed = parseInt(customDays.trim(), 10);
    if (!customDays.trim() || isNaN(parsed) || parsed <= 0) {
      customDaysError = 'Enter a number of days';
    } else {
      repeatDaysVal = parsed;
    }
  }

  const canSave = trimmedName.length > 0 && !birthdayError && !customDaysError;

  const handleSave = () => {
    if (!canSave) return;

    const data = {
      name: trimmedName,
      phone: phone.trim() || undefined,
      birthday: birthdayTrimmed || undefined,
      group: group.trim() || undefined,
      howWeMet: howWeMet.trim() || undefined,
      notes: notes.trim() || undefined,
      repeatEveryDays: repeatDaysVal,
    };

    if (isEditing && id) {
      appActions().updateFriend(id, data);
      router.back();
    } else {
      const created = appActions().addFriend(data);
      router.replace(`/friend/${created.id}`);
    }
  };

  const handleArchiveToggle = () => {
    if (!id || !existing) return;
    appActions().setArchived(id, !existing.archived);
    router.back();
  };

  const handleDelete = async () => {
    if (!id || !existing) return;
    const ok = await confirm({
      title: `Delete ${existing.name}?`,
      message:
        'Their logged moments will be removed. Gratitude notes stay in your journal as general gratitude.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) {
      appActions().deleteFriend(id);
      router.dismissTo('/(tabs)/friends');
    }
  };

  return (
    <Screen scroll padded>
      <ScreenHeader
        title={isEditing ? 'Edit friend' : 'New friend'}
        subtitle={
          isEditing
            ? 'Update relationship details'
            : 'Add someone you want to keep in touch with'
        }
      />

      <TextField
        label="Name *"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Ravi Kumar"
        autoFocus={!isEditing}
      />

      <TextField
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        placeholder="e.g. +1 555 123 4567"
        keyboardType="phone-pad"
      />

      <TextField
        label="Birthday"
        value={birthday}
        onChangeText={setBirthday}
        placeholder="MM-DD or YYYY-MM-DD"
        error={birthdayError}
        hint="Optional. Used for reminder countdowns."
      />

      {/* Group */}
      <View style={{ marginBottom: spacing.md }}>
        <ThemedText
          variant="smallStrong"
          color="textSecondary"
          style={{ marginBottom: spacing.xs }}
        >
          Group
        </ThemedText>
        {existingGroups.length > 0 ? (
          <View
            style={[
              styles.chipsWrap,
              { marginBottom: spacing.sm, gap: spacing.xs },
            ]}
          >
            {existingGroups.map((g) => (
              <Chip
                key={g}
                label={g}
                selected={group.trim().toLowerCase() === g.toLowerCase()}
                onPress={() => setGroup(g)}
              />
            ))}
          </View>
        ) : null}
        <TextField
          label=""
          value={group}
          onChangeText={setGroup}
          placeholder="e.g. College, Work, Family"
        />
      </View>

      {/* Stay in touch cadence */}
      <View style={{ marginBottom: spacing.md }}>
        <ThemedText
          variant="smallStrong"
          color="textSecondary"
          style={{ marginBottom: spacing.xs }}
        >
          Stay in touch every
        </ThemedText>
        <View style={[styles.chipsWrap, { gap: spacing.xs }]}>
          <Chip
            label="None"
            selected={repeatMode === 'none'}
            onPress={() => setRepeatMode('none')}
          />
          <Chip
            label="7 days"
            selected={repeatMode === '7'}
            onPress={() => setRepeatMode('7')}
          />
          <Chip
            label="14 days"
            selected={repeatMode === '14'}
            onPress={() => setRepeatMode('14')}
          />
          <Chip
            label="30 days"
            selected={repeatMode === '30'}
            onPress={() => setRepeatMode('30')}
          />
          <Chip
            label="Custom"
            selected={repeatMode === 'custom'}
            onPress={() => setRepeatMode('custom')}
          />
        </View>

        {repeatMode === 'custom' ? (
          <View style={{ marginTop: spacing.sm }}>
            <TextField
              label="Days between contacts"
              value={customDays}
              onChangeText={setCustomDays}
              placeholder="e.g. 21"
              keyboardType="number-pad"
              error={customDaysError}
            />
          </View>
        ) : null}
      </View>

      <TextField
        label="How we met"
        value={howWeMet}
        onChangeText={setHowWeMet}
        placeholder="e.g. Design meetup in Austin"
      />

      <TextField
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Favorite books, coffee preference, kids' names..."
        multiline
        numberOfLines={3}
      />

      <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
        <Button
          label={isEditing ? 'Save changes' : 'Add friend'}
          onPress={handleSave}
          disabled={!canSave}
          variant="primary"
        />

        {isEditing && existing ? (
          <>
            <Button
              label={existing.archived ? 'Unarchive friend' : 'Archive friend'}
              onPress={handleArchiveToggle}
              variant="secondary"
            />
            <Button
              label="Delete friend"
              onPress={handleDelete}
              variant="danger"
            />
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
});
