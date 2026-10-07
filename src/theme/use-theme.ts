import { useSettings } from '@/store/hooks';

import { palettes, type Palette } from './palettes';
import { fonts, radius, spacing, typeScale } from './tokens';
import { useColorScheme } from './use-color-scheme';

export function useTheme() {
  const settings = useSettings();
  const systemScheme = useColorScheme();

  const scheme: 'light' | 'dark' =
    settings.theme === 'warm-dark'
      ? 'dark'
      : settings.theme === 'warm-light'
        ? 'light'
        : systemScheme === 'dark'
          ? 'dark'
          : 'light';

  return {
    scheme,
    colors: palettes[scheme],
    spacing,
    radius,
    fonts,
    typeScale,
  };
}

export type Theme = ReturnType<typeof useTheme>;
export type { Palette };
