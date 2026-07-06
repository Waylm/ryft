import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Mono } from './Typography';

/** "SKINCARE ————" style section header with a trailing hairline. */
export function SectionLabel({
  children,
  right,
}: {
  children: string;
  right?: React.ReactNode;
}) {
  const { colors, fontSize } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <Mono size={fontSize.micro} weight="semibold" tracking={2} upper color={colors.muted}>
        {children}
      </Mono>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
      {right}
    </View>
  );
}
