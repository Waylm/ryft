import { View } from 'react-native';
import { useTheme } from '@/theme';
import type { SegStatus } from '@/lib/status';
import { Mono } from './Typography';

export function Pill({
  label,
  status = 'neutral',
}: {
  label: string;
  status?: SegStatus | 'neutral';
}) {
  const theme = useTheme();
  const { colors, radius, fontSize } = theme;
  const isDark = theme.scheme === 'dark';

  let bg = 'transparent';
  let border = colors.dim;
  let fg = colors.muted;

  if (status === 'done') {
    bg = isDark ? 'rgba(242,242,242,0.08)' : 'rgba(10,10,10,0.06)';
    border = isDark ? 'rgba(242,242,242,0.22)' : 'rgba(10,10,10,0.18)';
    fg = colors.bright;
  } else if (status === 'partial') {
    bg = 'transparent';
    border = colors.mid;
    fg = colors.mid;
  }

  return (
    <View
      style={{
        backgroundColor: bg,
        borderColor: border,
        borderWidth: 1,
        borderRadius: radius.sm,
        paddingHorizontal: 10,
        paddingVertical: 3,
      }}
    >
      <Mono size={fontSize.micro} weight="semibold" tracking={1.2} upper color={fg}>
        {label}
      </Mono>
    </View>
  );
}
