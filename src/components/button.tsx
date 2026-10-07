import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from './themed-text';
import { useTheme } from '@/theme/use-theme';
import type { IconName } from '@/utils/interaction-meta';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  testID,
  style,
}: ButtonProps) {
  const { colors, radius, spacing } = useTheme();

  const variantStyles: Record<
    ButtonVariant,
    { container: ViewStyle; textColor: keyof typeof colors; iconColor: string }
  > = {
    primary: {
      container: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
      },
      textColor: 'onPrimary',
      iconColor: colors.onPrimary,
    },
    secondary: {
      container: {
        backgroundColor: colors.secondarySoft,
        borderColor: colors.border,
      },
      textColor: 'text',
      iconColor: colors.text,
    },
    ghost: {
      container: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
      },
      textColor: 'primary',
      iconColor: colors.primary,
    },
    danger: {
      container: {
        backgroundColor: colors.accentSoft,
        borderColor: colors.border,
      },
      textColor: 'primary',
      iconColor: colors.primary,
    },
  };

  const current = variantStyles[variant];

  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          borderRadius: radius.pill,
          paddingHorizontal: spacing.xl,
          borderWidth: 1,
        },
        current.container,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={current.iconColor}
          style={{ marginRight: spacing.sm }}
        />
      ) : null}
      <ThemedText
        variant="bodyStrong"
        color={current.textColor}
        style={styles.label}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.45,
  },
});
