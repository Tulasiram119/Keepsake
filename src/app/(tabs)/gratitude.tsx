import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { format, parseISO } from 'date-fns';
import { router } from 'expo-router';

import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { Fab } from '@/components/fab';
import { GratitudeCard } from '@/components/gratitude-card';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { useFriends, useGratitude } from '@/store/hooks';
import { useTheme } from '@/theme/use-theme';
import type { GratitudeEntry } from '@/types/models';
import { byDateDesc } from '@/utils/derived';

interface GratitudeSection {
  title: string;
  data: GratitudeEntry[];
}

export default function GratitudeScreen() {
  const friends = useFriends();
  const gratitudeList = useGratitude();
  const { colors, spacing } = useTheme();

  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const now = useMemo(() => new Date(), []);

  // Friends who have at least one gratitude entry
  const friendsWithEntries = useMemo(() => {
    const friendIdsWithNotes = new Set<string>();
    for (const g of gratitudeList) {
      for (const fId of g.friendIds) {
        friendIdsWithNotes.add(fId);
      }
    }
    return friends.filter((f) => friendIdsWithNotes.has(f.id));
  }, [friends, gratitudeList]);

  // Filtered gratitude entries
  const filteredEntries = useMemo(() => {
    let list: GratitudeEntry[];
    if (selectedFilter === 'all') {
      list = gratitudeList;
    } else if (selectedFilter === 'life') {
      list = gratitudeList.filter((g) => g.friendIds.length === 0);
    } else {
      list = gratitudeList.filter((g) => g.friendIds.includes(selectedFilter));
    }
    return [...list].sort(byDateDesc);
  }, [gratitudeList, selectedFilter]);

  // Group by month
  const sections: GratitudeSection[] = useMemo(() => {
    const map = new Map<string, GratitudeEntry[]>();
    for (const item of filteredEntries) {
      try {
        const monthKey = format(parseISO(item.date), 'MMMM yyyy');
        const current = map.get(monthKey) || [];
        current.push(item);
        map.set(monthKey, current);
      } catch {
        const fallback = 'Recent';
        const current = map.get(fallback) || [];
        current.push(item);
        map.set(fallback, current);
      }
    }

    return Array.from(map.entries()).map(([title, data]) => ({
      title,
      data,
    }));
  }, [filteredEntries]);

  const subtitle = `${gratitudeList.length} ${
    gratitudeList.length === 1 ? 'moment' : 'moments'
  } kept`;

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xs }}>
        <ScreenHeader
          eyebrow="Moments of thankfulness"
          title="Gratitude"
          subtitle={subtitle}
        />

        {/* Filter chips */}
        <View style={[styles.chipsRow, { gap: spacing.xs, marginBottom: spacing.md }]}>
          <Chip
            label="All"
            selected={selectedFilter === 'all'}
            onPress={() => setSelectedFilter('all')}
          />
          <Chip
            label="Life"
            selected={selectedFilter === 'life'}
            onPress={() => setSelectedFilter('life')}
          />
          {friendsWithEntries.map((f) => (
            <Chip
              key={f.id}
              label={f.name}
              selected={selectedFilter === f.id}
              onPress={() => setSelectedFilter(f.id)}
            />
          ))}
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxl + 40,
        }}
        renderSectionHeader={({ section: { title } }) => (
          <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
            <ThemedText variant="smallStrong" color="textSecondary">
              {title}
            </ThemedText>
          </View>
        )}
        renderItem={({ item }) => (
          <GratitudeCard
            entry={item}
            friends={friends}
            now={now}
            onPress={() => router.push(`/add-gratitude?entryId=${item.id}` as any)}
          />
        )}
        ListEmptyComponent={
          gratitudeList.length === 0 ? (
            <EmptyState
              icon="heart-outline"
              title="Start a little gratitude habit"
              message="Note one good thing — a person, a moment, a sunny walk."
              actionLabel="Write the first one"
              onAction={() => router.push('/add-gratitude')}
            />
          ) : (
            <EmptyState
              icon="search-outline"
              title="No entries in this view"
              message="There are no notes matching the selected filter."
            />
          )
        }
      />

      <Fab
        label="Add gratitude"
        icon="heart-outline"
        onPress={() => router.push('/add-gratitude')}
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
  sectionHeader: {
    paddingVertical: 8,
  },
});
