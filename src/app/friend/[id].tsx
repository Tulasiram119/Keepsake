import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';

export default function FriendDetailScreen() {
  return (
    <Screen>
      <ScreenHeader title="Friend" />
      <ThemedText>Friend details</ThemedText>
    </Screen>
  );
}
