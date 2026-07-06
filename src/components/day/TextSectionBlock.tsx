import { useEffect, useRef, useState } from 'react';
import { View, Pressable, TextInput, Alert } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Feather } from '@expo/vector-icons';
import { SectionLabel } from '@/components/SectionLabel';
import { useTheme } from '@/theme';
import type { TextSection } from '@/db/types';
import { deleteTextSection, updateTextSection } from '@/db/queries';

export function TextSectionBlock({
  section,
  db,
  onChange,
}: {
  section: TextSection;
  db: SQLiteDatabase;
  onChange: () => void;
}) {
  const { colors, spacing, fontSize } = useTheme();
  const [value, setValue] = useState(section.content);
  const dirty = useRef(false);

  useEffect(() => {
    // Adopt external content only when we haven't got unsaved local edits.
    if (!dirty.current) setValue(section.content);
  }, [section.content]);

  const save = async () => {
    if (!dirty.current) return;
    dirty.current = false;
    await updateTextSection(db, section.id, { content: value });
    onChange();
  };

  const confirmDelete = () => {
    Alert.alert('Delete section', `Remove "${section.label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTextSection(db, section.id);
          onChange();
        },
      },
    ]);
  };

  return (
    <View style={{ marginBottom: spacing.xxl }}>
      <SectionLabel
        right={
          <Pressable onPress={confirmDelete} hitSlop={8}>
            <Feather name="trash-2" size={13} color={colors.muted} />
          </Pressable>
        }
      >
        {section.label}
      </SectionLabel>
      <TextInput
        value={value}
        onChangeText={(t) => {
          dirty.current = true;
          setValue(t);
        }}
        onBlur={save}
        multiline
        placeholder="Write it down…"
        placeholderTextColor={colors.muted}
        style={{
          fontFamily: 'IBMPlexSerif_400Regular',
          fontSize: fontSize.body,
          lineHeight: fontSize.body * 1.6,
          color: colors.text,
          minHeight: 44,
          textAlignVertical: 'top',
        }}
      />
    </View>
  );
}
