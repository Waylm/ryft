import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Mono, Serif } from '@/components';
import { SectionLabel } from '@/components/SectionLabel';
import { useTheme, useThemePreference, type ThemePreference } from '@/theme';

const OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const { colors, spacing, fontSize, radius } = theme;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { preference, setPreference } = useThemePreference();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + spacing.xxxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl }}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="chevron-left" size={24} color={colors.mid} />
          </Pressable>
        </View>

        <Mono size={fontSize.tiny} weight="bold" tracking={3} upper color={colors.accent}>
          Settings
        </Mono>

        {/* Appearance */}
        <View style={{ marginTop: spacing.xxl }}>
          <SectionLabel>Appearance</SectionLabel>
          <View
            style={{
              flexDirection: 'row',
              borderWidth: 1,
              borderColor: colors.dim,
              borderRadius: radius.md,
              padding: 3,
              gap: 3,
            }}
          >
            {OPTIONS.map((opt) => {
              const active = preference === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setPreference(opt.key)}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.md,
                    borderRadius: radius.sm,
                    backgroundColor: active ? colors.accent : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <Mono
                    size={fontSize.tiny}
                    weight="semibold"
                    tracking={1}
                    upper
                    color={active ? colors.onAccent : colors.mid}
                  >
                    {opt.label}
                  </Mono>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* About */}
        <View style={{ marginTop: spacing.xxl }}>
          <SectionLabel>About</SectionLabel>
          <Serif size={fontSize.lg} color={colors.bright}>
            Ryft
          </Serif>
          <Serif italic size={fontSize.body} color={colors.text} style={{ marginTop: spacing.sm, lineHeight: fontSize.body * 1.5 }}>
            A journal for closing the gap between you and your prime. Local-first, open source, free.
          </Serif>
          <Mono size={fontSize.tiny} color={colors.muted} style={{ marginTop: spacing.lg }}>
            v0.1.0 · your data lives on this device
          </Mono>
        </View>
      </ScrollView>
    </View>
  );
}
