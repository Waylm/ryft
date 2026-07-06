import { useEffect, useState } from 'react';
import { View, Pressable, TextInput, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Feather } from '@expo/vector-icons';
import { Mono, Button, Toggle } from '@/components';
import { SectionLabel } from '@/components/SectionLabel';
import { PromptModal } from '@/components/PromptModal';
import { useTheme } from '@/theme';
import type { TemplateItem, TemplateItemType } from '@/db/types';
import {
  addTemplateItem,
  deleteTemplateItem,
  listTemplateItems,
  updateTemplateItem,
} from '@/db/queries';

const TYPE_META: Record<TemplateItemType, { icon: keyof typeof Feather.glyphMap; name: string }> = {
  checklist: { icon: 'check-square', name: 'Checklist' },
  list: { icon: 'list', name: 'List' },
  text: { icon: 'align-left', name: 'Text' },
  focus: { icon: 'target', name: 'Focus' },
  metrics: { icon: 'bar-chart-2', name: 'Metrics' },
  photos: { icon: 'image', name: 'Photos' },
};

// Types the user can add/remove; metrics & photos are fixed singleton toggles.
const ADDABLE: TemplateItemType[] = ['checklist', 'list', 'text', 'focus'];
const RENAMABLE = new Set<TemplateItemType>(['checklist', 'list', 'text', 'focus']);

export function JournalTemplateEditor() {
  const { colors, spacing, fontSize } = useTheme();
  const db = useSQLiteContext();
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [renaming, setRenaming] = useState<TemplateItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = () => listTemplateItems(db).then(setItems);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  const toggle = async (item: TemplateItem) => {
    await updateTemplateItem(db, item.id, { enabled: !item.enabled });
    load();
  };

  const submitRename = async (label: string) => {
    if (renaming) await updateTemplateItem(db, renaming.id, { label });
    setRenaming(null);
    load();
  };

  const remove = (item: TemplateItem) => {
    Alert.alert('Remove from template', `New days will no longer include "${item.label}".`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteTemplateItem(db, item.id);
          load();
        },
      },
    ]);
  };

  const add = async (type: TemplateItemType, label: string) => {
    await addTemplateItem(db, type, label);
    setAddOpen(false);
    load();
  };

  return (
    <View style={{ marginTop: spacing.xxl }}>
      <SectionLabel
        right={
          <Pressable onPress={() => setAddOpen(true)} hitSlop={8}>
            <Feather name="plus" size={16} color={colors.mid} />
          </Pressable>
        }
      >
        Journal Template
      </SectionLabel>
      <Mono size={fontSize.tiny} color={colors.muted} style={{ marginBottom: spacing.lg }}>
        What every new day starts with. Toggle off what you don't want.
      </Mono>

      <View style={{ gap: spacing.xs }}>
        {items.map((item) => {
          const meta = TYPE_META[item.type];
          const canDelete = ADDABLE.includes(item.type);
          const canRename = RENAMABLE.has(item.type);
          return (
            <View
              key={item.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: colors.line,
              }}
            >
              <Feather name={meta.icon} size={15} color={item.enabled ? colors.mid : colors.dim} />
              <Pressable
                style={{ flex: 1 }}
                disabled={!canRename}
                onPress={() => setRenaming(item)}
              >
                <Mono size={fontSize.label} color={item.enabled ? colors.bright : colors.muted}>
                  {item.label}
                </Mono>
                <Mono size={fontSize.micro} tracking={1} upper color={colors.muted} style={{ marginTop: 2 }}>
                  {meta.name}
                </Mono>
              </Pressable>
              {canDelete ? (
                <Pressable onPress={() => remove(item)} hitSlop={8} style={{ paddingHorizontal: 4 }}>
                  <Feather name="x" size={15} color={colors.dim} />
                </Pressable>
              ) : null}
              <Toggle on={item.enabled} onPress={() => toggle(item)} />
            </View>
          );
        })}
      </View>

      <PromptModal
        visible={renaming !== null}
        title="Rename section"
        initialValue={renaming?.label ?? ''}
        submitLabel="Save"
        onSubmit={submitRename}
        onClose={() => setRenaming(null)}
      />
      <AddTemplateModal visible={addOpen} onAdd={add} onClose={() => setAddOpen(false)} />
    </View>
  );
}

function AddTemplateModal({
  visible,
  onAdd,
  onClose,
}: {
  visible: boolean;
  onAdd: (type: TemplateItemType, label: string) => void;
  onClose: () => void;
}) {
  const { colors, spacing, fontSize, radius } = useTheme();
  const [type, setType] = useState<TemplateItemType>('checklist');
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (visible) {
      setType('checklist');
      setLabel('');
    }
  }, [visible]);

  const valid = label.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              backgroundColor: colors.bg,
              borderTopLeftRadius: radius.lg * 2,
              borderTopRightRadius: radius.lg * 2,
              borderWidth: 1,
              borderColor: colors.line,
              paddingHorizontal: spacing.xl,
              paddingTop: spacing.lg,
              paddingBottom: spacing.xxxl,
              gap: spacing.lg,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Mono size={fontSize.tiny} weight="bold" tracking={2} upper color={colors.mid}>
                Add to template
              </Mono>
              <Pressable onPress={onClose} hitSlop={10}>
                <Feather name="x" size={20} color={colors.mid} />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {ADDABLE.map((t) => {
                const meta = TYPE_META[t];
                const active = type === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setType(t)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      borderWidth: 1,
                      borderColor: active ? colors.accent : colors.dim,
                      backgroundColor: active ? colors.accent : 'transparent',
                      borderRadius: radius.md,
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                    }}
                  >
                    <Feather name={meta.icon} size={13} color={active ? colors.onAccent : colors.mid} />
                    <Mono size={fontSize.tiny} weight="semibold" tracking={1} upper color={active ? colors.onAccent : colors.mid}>
                      {meta.name}
                    </Mono>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="Name it — Calories, Woke up, Reading…"
              placeholderTextColor={colors.muted}
              autoFocus
              style={{
                fontFamily: 'IBMPlexMono_400Regular',
                fontSize: fontSize.body,
                color: colors.bright,
                borderBottomWidth: 1,
                borderBottomColor: colors.line,
                paddingVertical: spacing.sm,
              }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Button
                label="Add"
                onPress={() => valid && onAdd(type, label.trim())}
                disabled={!valid}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
