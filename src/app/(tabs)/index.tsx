import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';

export default function HomeScreen() {
  return (
    <Screen>
      <ScreenHeader
        eyebrow="Keep in touch"
        title="Home"
        subtitle="People you care about"
      />
      <ThemedText variant="body" color="textSecondary">
        Your connection dashboard will appear here.
      </ThemedText>
    </Screen>
  );
}
