import { useEffect, useState } from 'react';
import { View, Pressable, TextInput, Alert } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { Mono } from '@/components/Typography';
import { SectionLabel } from '@/components/SectionLabel';
import { useTheme } from '@/theme';
import type { FocusArea, FocusBlock as FocusBlockType, FocusIntensity } from '@/db/types';
import { addFocusArea, deleteFocusArea, deleteFocusBlock, setFocusIntensity } from '@/db/queries';

const LEVEL_LABEL: Record<FocusIntensity, string> = { 1: 'Low', 2: 'Mid', 3: 'High' };

function cycle(i: FocusIntensity): FocusIntensity {
  return i === 3 ? 1 : ((i + 1) as FocusIntensity);
}

export function FocusBlock({
  block,
  db,
  onChange,
}: {
  block: FocusBlockType;
  db: SQLiteDatabase;
  onChange: () => void;
}) {
  const { colors, spacing, fontSize } = useTheme();
  const [areas, setAreas] = useState<FocusArea[]>(block.areas);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setAreas(block.areas);
  }, [block.areas]);

  const bump = async (area: FocusArea) => {
    Haptics.selectionAsync().catch(() => {});
    const next = cycle(area.intensity);
    setAreas((prev) => prev.map((a) => (a.id === area.id ? { ...a, intensity: next } : a)));
    await setFocusIntensity(db, area.id, next);
    onChange();
  };

  const removeArea = async (area: FocusArea) => {
    setAreas((prev) => prev.filter((a) => a.id !== area.id));
    await deleteFocusArea(db, area.id);
    onChange();
  };

  const addArea = async () => {
    const label = draft.trim();
    if (!label) return;
    setDraft('');
    await addFocusArea(db, block.id, label, 2);
    onChange();
  };

  const confirmDeleteBlock = () => {
    Alert.alert('Delete focus', `Remove "${block.label}" and its areas?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteFocusBlock(db, block.id);
          onChange();
        },
      },
    ]);
  };

  return (
    <View style={{ marginBottom: spacing.xxl }}>
      <SectionLabel
        right={
          <Pressable onPress={confirmDeleteBlock} hitSlop={8}>
            <Feather name="trash-2" size={13} color={colors.muted} />
          </Pressable>
        }
      >
        {block.label}
      </SectionLabel>

      <View style={{ gap: spacing.md }}>
        {areas.map((area) => (
          <View key={area.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Mono size={fontSize.label} color={colors.bright} style={{ flex: 1 }}>
              {area.label}
            </Mono>
            <Pressable
              onPress={() => bump(area)}
              hitSlop={6}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <IntensityBars intensity={area.intensity} />
              <Mono size={fontSize.micro} weight="semibold" tracking={1} upper color={colors.mid} style={{ width: 34 }}>
                {LEVEL_LABEL[area.intensity]}
              </Mono>
            </Pressable>
            <Pressable onPress={() => removeArea(area)} hitSlop={8}>
              <Feather name="x" size={14} color={colors.dim} />
            </Pressable>
          </View>
        ))}

        {/* Add area */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 2 }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={addArea}
            blurOnSubmit={false}
            placeholder="Add area — shoulders, legs…"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            style={{
              flex: 1,
              fontFamily: 'IBMPlexMono_400Regular',
              fontSize: fontSize.label,
              color: colors.text,
              paddingVertical: 2,
            }}
          />
        </View>
      </View>
    </View>
  );
}

function IntensityBars({ intensity }: { intensity: FocusIntensity }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 16 }}>
      {[1, 2, 3].map((level) => (
        <View
          key={level}
          style={{
            width: 5,
            height: 6 + level * 3,
            borderRadius: 1,
            backgroundColor: level <= intensity ? colors.statusDone : colors.dim,
          }}
        />
      ))}
    </View>
  );
}
