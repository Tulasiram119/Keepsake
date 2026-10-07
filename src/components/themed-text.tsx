import type { ComponentProps } from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';

import type { Palette } from '@/theme/palettes';
import { useTheme } from '@/theme/use-theme';

export type TextVariant =
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'small'
  | 'smallStrong';

export interface ThemedTextProps extends ComponentProps<typeof Text> {
  variant?: TextVariant;
  color?: keyof Palette;
}

export function ThemedText({
  variant = 'body',
  color = 'text',
  style,
  children,
  ...rest
}: ThemedTextProps) {
  const { colors, fonts, typeScale } = useTheme();

  const variantStyles: Record<TextVariant, TextStyle> = {
    title: {
      fontFamily: fonts.display,
      fontSize: typeScale.title,
      lineHeight: typeScale.title * 1.25,
    },
    heading: {
      fontFamily: fonts.display,
      fontSize: typeScale.heading,
      lineHeight: typeScale.heading * 1.3,
    },
    subheading: {
      fontFamily: fonts.bodyBold,
      fontSize: typeScale.subheading,
      lineHeight: typeScale.subheading * 1.35,
    },
    body: {
      fontFamily: fonts.body,
      fontSize: typeScale.body,
      lineHeight: typeScale.body * 1.4,
    },
    bodyStrong: {
      fontFamily: fonts.bodyBold,
      fontSize: typeScale.body,
      lineHeight: typeScale.body * 1.4,
    },
    small: {
      fontFamily: fonts.body,
      fontSize: typeScale.small,
      lineHeight: typeScale.small * 1.4,
    },
    smallStrong: {
      fontFamily: fonts.bodyBold,
      fontSize: typeScale.small,
      lineHeight: typeScale.small * 1.4,
    },
  };

  return (
    <Text
      style={[
        styles.base,
        variantStyles[variant],
        { color: colors[color] },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
