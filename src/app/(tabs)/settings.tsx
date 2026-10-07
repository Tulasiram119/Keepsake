import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';

export default function SettingsScreen() {
  return (
    <Screen>
      <ScreenHeader
        eyebrow="Preferences"
        title="Settings"
        subtitle="Theme and data"
      />
      <ThemedText variant="body" color="textSecondary">
        Settings options will appear here.
      </ThemedText>
    </Screen>
  );
}
