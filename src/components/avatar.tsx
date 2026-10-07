import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from './themed-text';
import { useTheme } from '@/theme/use-theme';

export interface AvatarProps {
  name: string;
  size?: number;
  photoUri?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function Avatar({ name, size = 44, photoUri }: AvatarProps) {
  const { colors } = useTheme();
  const [imageError, setImageError] = useState(false);

  const warmTonePairs = [
    { bg: colors.primarySoft, text: 'primary' as const },
    { bg: colors.secondarySoft, text: 'secondary' as const },
    { bg: colors.accentSoft, text: 'accent' as const },
    { bg: colors.successSoft, text: 'success' as const },
  ];

  const tone = warmTonePairs[hashString(name || 'default') % warmTonePairs.length];
  const fontSize = Math.max(12, Math.floor(size * 0.4));
  const initials = getInitials(name);

  if (photoUri && !imageError) {
    return (
      <Image
        source={{ uri: photoUri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
        contentFit="cover"
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tone.bg,
        },
      ]}
    >
      <ThemedText
        variant="bodyStrong"
        color={tone.text}
        style={{ fontSize, lineHeight: fontSize * 1.2 }}
      >
        {initials}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
