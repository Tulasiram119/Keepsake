import { useMemo } from 'react';
import { FlatList, Linking, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { EmptyState } from '@/components/empty-state';
import { Fab } from '@/components/fab';
import { FriendCard } from '@/components/friend-card';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { useFriends, useGratitude, useInteractions } from '@/store/hooks';
import { useTheme } from '@/theme/use-theme';
import { buildDashboard } from '@/utils/derived';

export default function HomeScreen() {
  const friends = useFriends();
  const interactions = useInteractions();
  const gratitudeList = useGratitude();
  const { spacing } = useTheme();

  const now = useMemo(() => new Date(), []);

  const dashboard = useMemo(
    () => buildDashboard(friends, interactions, gratitudeList, now),
    [friends, interactions, gratitudeList, now],
  );

  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const overdueCount = dashboard.filter((e) => e.status === 'overdue').length;
  const subtitle =
    overdueCount > 0
      ? `${overdueCount} ${
          overdueCount === 1 ? 'friend' : 'friends'
        } would love to hear from you`
      : "You're nicely in touch";

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xs }}>
        <ScreenHeader
          eyebrow={greeting}
          title="How long has it been?"
          subtitle={subtitle}
        />
      </View>

      <FlatList
        data={dashboard}
        keyExtractor={(item) => item.friend.id}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxl + 40,
        }}
        renderItem={({ item }) => (
          <FriendCard
            entry={item}
            now={now}
            onPress={() => router.push(`/friend/${item.friend.id}` as any)}
            onLog={() => router.push(`/log-interaction?friendId=${item.friend.id}` as any)}
            onCall={
              item.friend.phone
                ? () => {
                    void Linking.openURL(`tel:${item.friend.phone}`);
                  }
                : undefined
            }
            onGratitude={() =>
              router.push(`/add-gratitude?friendId=${item.friend.id}` as any)
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="sparkles-outline"
            title="Keep your people close"
            message="Add a friend and Keepsake will gently remind you when it's been a while."
            actionLabel="Add your first friend"
            onAction={() => router.push('/friend/edit')}
          />
        }
      />

      <Fab
        label="Log a moment"
        icon="cafe-outline"
        onPress={() => router.push('/log-interaction')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({});
