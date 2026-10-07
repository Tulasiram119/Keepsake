import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/use-theme';
import type { IconName } from '@/utils/interaction-meta';

export type IconButtonTone = 'primary' | 'accent' | 'neutral';

export interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  tone?: IconButtonTone;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  tone = 'neutral',
  size = 22,
  disabled = false,
  style,
  testID,
}: IconButtonProps) {
  const { colors, radius } = useTheme();

  const toneConfig: Record<
    IconButtonTone,
    { bg: string; border: string; iconColor: string }
  > = {
    neutral: {
      bg: colors.surface,
      border: colors.border,
      iconColor: colors.text,
    },
    primary: {
      bg: colors.primarySoft,
      border: colors.primary,
      iconColor: colors.primary,
    },
    accent: {
      bg: colors.accentSoft,
      border: colors.accent,
      iconColor: colors.accent,
    },
  };

  const current = toneConfig[tone];

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          borderRadius: radius.pill,
          backgroundColor: current.bg,
          borderColor: current.border,
        },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={current.iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    minHeight: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.45,
  },
});
