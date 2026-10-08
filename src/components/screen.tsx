import { useEffect, useState, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from './themed-text';
import { useTheme } from '@/theme/use-theme';

export interface ScreenProps {
  children?: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardOffset?: number;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top', 'left', 'right'],
  style,
  contentContainerStyle,
  keyboardOffset = 0,
}: ScreenProps) {
  const { colors, radius, spacing } = useTheme();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: colors.background,
  };

  const innerStyle: ViewStyle = {
    flex: 1,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingHorizontal: padded ? spacing.lg : 0,
  };

  const content = scroll ? (
    <ScrollView
      style={[innerStyle, style]}
      contentContainerStyle={[
        padded && {
          paddingTop: spacing.xs,
          paddingBottom: spacing.xxl + 80,
        },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View
        style={[
          innerStyle,
          padded && {
            paddingTop: spacing.xs,
            paddingBottom: spacing.md,
          },
          style,
        ]}
      >
        {children}
      </View>
    </TouchableWithoutFeedback>
  );

  return (
    <SafeAreaView edges={edges} style={containerStyle}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardOffset}
        style={styles.keyboard}
      >
        {content}

        {isKeyboardVisible ? (
          <View
            style={[
              styles.keyboardToolbar,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs + 2,
              },
            ]}
          >
            <ThemedText variant="small" color="textSecondary">
              Swipe down or tap Done to dismiss
            </ThemedText>
            <Pressable
              onPress={() => Keyboard.dismiss()}
              hitSlop={8}
              style={({ pressed }) => [
                styles.doneButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.pill,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Done editing"
            >
              <Ionicons name="chevron-down" size={14} color="#ffffff" />
              <ThemedText
                variant="smallStrong"
                style={{ color: '#ffffff', marginLeft: 4 }}
              >
                Done
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  keyboardToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
});
