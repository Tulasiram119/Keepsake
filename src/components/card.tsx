import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/use-theme';

export type CardTone = 'surface' | 'accent' | 'warning' | 'success';

export interface CardProps extends ViewProps {
  tone?: CardTone;
  onPress?: () => void;
  children?: ReactNode;
}

export function Card({
  tone = 'surface',
  onPress,
  style,
  children,
  ...rest
}: CardProps) {
  const { colors, radius, spacing } = useTheme();

  const toneBg: Record<CardTone, string> = {
    surface: colors.surface,
    accent: colors.accentSoft,
    warning: colors.warningSoft,
    success: colors.successSoft,
  };

  const cardStyle: ViewStyle = {
    backgroundColor: toneBg[tone],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          pressed && { opacity: 0.88 },
          style as StyleProp<ViewStyle>,
        ]}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[cardStyle, style]} {...rest}>
      {children}
    </View>
  );
}
