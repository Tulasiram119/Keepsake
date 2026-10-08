import { useEffect } from 'react';
import {
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
} from '@expo-google-fonts/fraunces';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import { ThemeProvider, type Theme as NavTheme } from 'expo-router/react-navigation';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { Platform } from 'react-native';

import { syncAllNotifications } from '@/services/notifications';
import { useAppStore } from '@/store';
import { useHasHydrated } from '@/store/hooks';
import { useTheme } from '@/theme/use-theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const hasHydrated = useHasHydrated();
  const { scheme, colors, fonts } = useTheme();

  useEffect(() => {
    if (fontsLoaded && hasHydrated) {
      void SplashScreen.hideAsync();
      if (Platform.OS !== 'web') {
        void syncAllNotifications(useAppStore.getState());
      }
    }
  }, [fontsLoaded, hasHydrated]);

  if (!fontsLoaded || !hasHydrated) {
    return null;
  }

  const navTheme: NavTheme = {
    dark: scheme === 'dark',
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
    fonts: {
      regular: { fontFamily: fonts.body, fontWeight: 'normal' },
      medium: { fontFamily: fonts.bodyMedium, fontWeight: '500' },
      bold: { fontFamily: fonts.bodyBold, fontWeight: 'bold' },
      heavy: { fontFamily: fonts.bodyBold, fontWeight: '900' },
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="friend/[id]" />
        <Stack.Screen
          name="friend/edit"
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="log-interaction"
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="add-gratitude"
          options={{ presentation: 'modal' }}
        />
      </Stack>
    </ThemeProvider>
  );
}
