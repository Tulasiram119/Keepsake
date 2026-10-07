import {
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { ThemedText } from './themed-text';
import { useTheme } from '@/theme/use-theme';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
}

export function TextField({
  label,
  error,
  hint,
  style,
  ...rest
}: TextFieldProps) {
  const { colors, fonts, radius, spacing, typeScale } = useTheme();

  return (
    <View style={[styles.container, { marginBottom: spacing.md }]}>
      <ThemedText
        variant="smallStrong"
        color="textSecondary"
        style={{ marginBottom: spacing.xs }}
      >
        {label}
      </ThemedText>
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.primary : colors.border,
            color: colors.text,
            borderRadius: radius.sm,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            fontFamily: fonts.body,
            fontSize: typeScale.body,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <ThemedText
          variant="small"
          color="primary"
          style={{ marginTop: spacing.xs / 2 }}
        >
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText
          variant="small"
          color="textSecondary"
          style={{ marginTop: spacing.xs / 2 }}
        >
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
  },
});
