import { Pressable, View, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Mono } from './Typography';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  small?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  haptic?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  small = false,
  icon,
  fullWidth = false,
  style,
  haptic = true,
}: ButtonProps) {
  const { colors, radius, fontSize, spacing } = useTheme();

  const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.accent, fg: colors.onAccent, border: colors.accent },
    secondary: { bg: 'transparent', fg: colors.bright, border: colors.dim },
    ghost: { bg: 'transparent', fg: colors.mid, border: 'transparent' },
    danger: { bg: 'transparent', fg: colors.danger, border: colors.danger },
  };
  const p = palette[variant];

  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        if (haptic) Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [
        {
          backgroundColor: p.bg,
          borderColor: p.border,
          borderWidth: variant === 'ghost' ? 0 : 1,
          borderRadius: radius.md,
          paddingVertical: small ? spacing.sm : spacing.md,
          paddingHorizontal: small ? spacing.md : spacing.lg,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {icon}
        <Mono size={small ? fontSize.tiny : fontSize.label} weight="semibold" tracking={1} upper color={p.fg}>
          {label}
        </Mono>
      </View>
    </Pressable>
  );
}
