import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Mono } from './Typography';

/** Dashed empty-state box, matching the "nothing surfaced today" block in the reference. */
export function EmptyBlock({ children, note }: { children: string; note?: string }) {
  const { colors, radius, fontSize, spacing } = useTheme();
  return (
    <View>
      <View
        style={{
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: colors.dim,
          borderRadius: radius.md,
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.lg,
        }}
      >
        <Mono size={fontSize.small} color={colors.muted} tracking={0.5}>
          {children}
        </Mono>
      </View>
      {note ? (
        <Mono
          size={fontSize.tiny}
          italic
          color={colors.muted}
          style={{ marginTop: 6, fontStyle: 'italic' }}
        >
          {note}
        </Mono>
      ) : null}
    </View>
  );
}
