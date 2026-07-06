import { useEffect, useState } from 'react';
import { View, Pressable, TextInput, Alert } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { Mono } from '@/components/Typography';
import { SectionLabel } from '@/components/SectionLabel';
import { useTheme } from '@/theme';
import type { Checklist, ChecklistItem } from '@/db/types';
import {
  addChecklistItem,
  deleteChecklist,
  deleteChecklistItem,
  setChecklistItemDone,
} from '@/db/queries';

export function ChecklistBlock({
  checklist,
  db,
  onChange,
}: {
  checklist: Checklist;
  db: SQLiteDatabase;
  onChange: () => void;
}) {
  const { colors, spacing, fontSize, radius } = useTheme();
  const [items, setItems] = useState<ChecklistItem[]>(checklist.items);
  const [draft, setDraft] = useState('');

  // Re-sync when the underlying checklist changes (e.g. after a parent reload).
  useEffect(() => {
    setItems(checklist.items);
  }, [checklist.items]);

  const toggle = async (item: ChecklistItem) => {
    Haptics.selectionAsync().catch(() => {});
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)));
    await setChecklistItemDone(db, item.id, !item.done);
    onChange();
  };

  const removeItem = async (item: ChecklistItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await deleteChecklistItem(db, item.id);
    onChange();
  };

  const addItem = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    await addChecklistItem(db, checklist.id, text);
    onChange();
  };

  const confirmDeleteList = () => {
    Alert.alert('Delete checklist', `Remove "${checklist.label}" and its items?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteChecklist(db, checklist.id);
          onChange();
        },
      },
    ]);
  };

  return (
    <View style={{ marginBottom: spacing.xxl }}>
      <SectionLabel
        right={
          <Pressable onPress={confirmDeleteList} hitSlop={8}>
            <Feather name="trash-2" size={13} color={colors.muted} />
          </Pressable>
        }
      >
        {checklist.label}
      </SectionLabel>

      <View style={{ gap: spacing.sm }}>
        {items.map((item) => (
          <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Pressable
              onPress={() => toggle(item)}
              hitSlop={6}
              style={{
                width: 18,
                height: 18,
                borderRadius: radius.sm,
                borderWidth: 1.5,
                borderColor: item.done ? colors.accent : colors.dim,
                backgroundColor: item.done ? colors.accent : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {item.done ? <Feather name="check" size={12} color={colors.onAccent} /> : null}
            </Pressable>
            <Pressable style={{ flex: 1 }} onPress={() => toggle(item)}>
              <Mono
                size={fontSize.label}
                color={item.done ? colors.mid : colors.bright}
                style={item.done ? { textDecorationLine: 'line-through' } : undefined}
              >
                {item.text}
              </Mono>
            </Pressable>
            <Pressable onPress={() => removeItem(item)} hitSlop={8}>
              <Feather name="x" size={14} color={colors.dim} />
            </Pressable>
          </View>
        ))}

        {/* Add item row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 2 }}>
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: radius.sm,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: colors.dim,
            }}
          />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={addItem}
            blurOnSubmit={false}
            placeholder="Add item"
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
