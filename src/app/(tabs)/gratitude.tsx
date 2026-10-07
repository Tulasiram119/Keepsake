import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';

export default function GratitudeScreen() {
  return (
    <Screen>
      <ScreenHeader
        eyebrow="Moments of thankfulness"
        title="Gratitude"
        subtitle="Memories and reflections"
      />
      <ThemedText variant="body" color="textSecondary">
        Your gratitude journal will appear here.
      </ThemedText>
    </Screen>
  );
}
