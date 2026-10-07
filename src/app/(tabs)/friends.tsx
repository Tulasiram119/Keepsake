import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';

export default function FriendsScreen() {
  return (
    <Screen>
      <ScreenHeader
        eyebrow="Connections"
        title="Friends"
        subtitle="Your circles"
      />
      <ThemedText variant="body" color="textSecondary">
        Your friend list will appear here.
      </ThemedText>
    </Screen>
  );
}
