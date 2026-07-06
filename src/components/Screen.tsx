import type { ReactNode } from 'react';
import { View, ScrollView, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  contentStyle?: ViewStyle;
  /** Extra bottom padding so floating action buttons don't cover content. */
  bottomInset?: number;
  edges?: { top?: boolean; bottom?: boolean };
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  contentStyle,
  bottomInset = 0,
  edges = { top: true, bottom: false },
}: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const padding: ViewStyle = {
    paddingTop: edges.top ? insets.top : 0,
    paddingBottom: (edges.bottom ? insets.bottom : 0) + bottomInset,
    paddingHorizontal: padded ? spacing.xl : 0,
  };

  if (scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView
          contentContainerStyle={[padding, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg }, padding, contentStyle]}>{children}</View>
  );
}
