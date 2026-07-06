import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/theme';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

interface BaseProps extends TextProps {
  size?: number;
  color?: string;
  weight?: Weight;
  italic?: boolean;
  tracking?: number; // letterSpacing
  upper?: boolean;
  center?: boolean;
  style?: TextStyle | TextStyle[];
}

/** Monospace text — the structural/label voice of the app (IBM Plex Mono). */
export function Mono({
  size,
  color,
  weight = 'regular',
  tracking,
  upper,
  center,
  style,
  children,
  ...rest
}: BaseProps) {
  const theme = useTheme();
  const family =
    weight === 'bold'
      ? theme.fonts.mono.bold
      : weight === 'semibold'
        ? theme.fonts.mono.semibold
        : weight === 'medium'
          ? theme.fonts.mono.medium
          : theme.fonts.mono.regular;
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: family,
          fontSize: size ?? theme.fontSize.body,
          color: color ?? theme.colors.text,
          letterSpacing: tracking,
          textAlign: center ? 'center' : undefined,
          textTransform: upper ? 'uppercase' : undefined,
        },
        style as TextStyle,
      ]}
    >
      {children}
    </Text>
  );
}

/** Serif text — the reflective/reading voice (IBM Plex Serif), used for body prose. */
export function Serif({
  size,
  color,
  weight = 'regular',
  italic,
  tracking,
  center,
  style,
  children,
  ...rest
}: BaseProps) {
  const theme = useTheme();
  const family = italic
    ? theme.fonts.serif.italic
    : weight === 'medium' || weight === 'semibold' || weight === 'bold'
      ? theme.fonts.serif.medium
      : theme.fonts.serif.regular;
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: family,
          fontSize: size ?? theme.fontSize.body,
          color: color ?? theme.colors.text,
          letterSpacing: tracking,
          textAlign: center ? 'center' : undefined,
        },
        style as TextStyle,
      ]}
    >
      {children}
    </Text>
  );
}
