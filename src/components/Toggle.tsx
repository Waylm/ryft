import { Pressable, View } from 'react-native';
import { useTheme } from '@/theme';

export function Toggle({ on, onPress }: { on: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        padding: 3,
        backgroundColor: on ? colors.accent : colors.surfaceAlt,
        borderWidth: 1,
        borderColor: on ? colors.accent : colors.dim,
        alignItems: on ? 'flex-end' : 'flex-start',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: on ? colors.onAccent : colors.mid,
        }}
      />
    </Pressable>
  );
}
