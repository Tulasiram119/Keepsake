import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { FriendRow } from '@/components/friend-row';
import { IconButton } from '@/components/icon-button';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { TextField } from '@/components/text-field';
import { useFriends, useInteractions } from '@/store/hooks';
import { useTheme } from '@/theme/use-theme';
import type { Friend } from '@/types/models';
import { collectGroups, indexLastInteractions } from '@/utils/derived';

export default function FriendsScreen() {
  const friends = useFriends();
  const interactions = useInteractions();
  const { spacing } = useTheme();

  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  const groups = useMemo(() => collectGroups(friends), [friends]);
  const lastMap = useMemo(() => indexLastInteractions(interactions), [interactions]);
  const now = useMemo(() => new Date(), []);

  const activeFriends = useMemo(() => friends.filter((f) => !f.archived), [friends]);
  const archivedFriends = useMemo(() => friends.filter((f) => f.archived), [friends]);

  const filteredFriends = useMemo(() => {
    let list: Friend[];
    if (selectedGroup === 'archived') {
      list = archivedFriends;
    } else if (selectedGroup === 'all') {
      list = activeFriends;
    } else {
      list = activeFriends.filter(
        (f) => f.group?.toLowerCase() === selectedGroup.toLowerCase(),
      );
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [friends, activeFriends, archivedFriends, selectedGroup, search]);

  const subtitle = `${activeFriends.length} ${
    activeFriends.length === 1 ? 'person' : 'people'
  } you care about`;

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xs }}>
        <ScreenHeader
          eyebrow="Connections"
          title="Friends"
          subtitle={subtitle}
          right={
            <IconButton
              icon="person-add-outline"
              accessibilityLabel="Add friend"
              tone="primary"
              onPress={() => router.push('/friend/edit')}
            />
          }
        />

        <TextField
          label=""
          value={search}
          onChangeText={setSearch}
          placeholder="Search friends"
          clearButtonMode="while-editing"
        />

        {/* Group chips */}
        <View style={[styles.chipsRow, { gap: spacing.xs, marginBottom: spacing.md }]}>
          <Chip
            label="All"
            selected={selectedGroup === 'all'}
            onPress={() => setSelectedGroup('all')}
          />
          {groups.map((g) => (
            <Chip
              key={g}
              label={g}
              selected={selectedGroup === g}
              onPress={() => setSelectedGroup(g)}
            />
          ))}
          {archivedFriends.length > 0 ? (
            <Chip
              label={`Archived (${archivedFriends.length})`}
              selected={selectedGroup === 'archived'}
              onPress={() => setSelectedGroup('archived')}
            />
          ) : null}
        </View>
      </View>

      <FlatList
        data={filteredFriends}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
        renderItem={({ item }) => (
          <FriendRow
            friend={item}
            last={lastMap.get(item.id)}
            now={now}
            onPress={() => router.push(`/friend/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          friends.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="Your circle starts here"
              message="Add the people you want to stay close to."
              actionLabel="Add a friend"
              onAction={() => router.push('/friend/edit')}
            />
          ) : (
            <EmptyState
              icon="search-outline"
              title="No friends found"
              message={
                search.trim()
                  ? `No friends matched "${search}".`
                  : 'No friends in this group.'
              }
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
});
