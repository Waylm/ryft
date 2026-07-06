import { useEffect, useState } from 'react';
import { Modal, View, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Mono, Button } from '@/components';
import { useTheme } from '@/theme';
import type { Metric } from '@/db/types';

export interface MetricDraft {
  key: string;
  label: string;
  value: number;
  unit: string;
}

export function normalizeKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export function MetricEditorModal({
  visible,
  initial,
  preset,
  onSubmit,
  onDelete,
  onClose,
}: {
  visible: boolean;
  initial: Metric | null;
  preset?: { label: string; unit: string } | null;
  onSubmit: (draft: MetricDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const { colors, spacing, fontSize, radius } = useTheme();
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');

  useEffect(() => {
    if (visible) {
      setLabel(initial?.label ?? preset?.label ?? '');
      setValue(initial ? String(initial.value) : '');
      setUnit(initial?.unit ?? preset?.unit ?? '');
    }
  }, [visible, initial, preset]);

  const numeric = parseFloat(value.replace(',', '.'));
  const valid = label.trim().length > 0 && !Number.isNaN(numeric);

  const submit = () => {
    if (!valid) return;
    onSubmit({ key: normalizeKey(label), label: label.trim(), value: numeric, unit: unit.trim() });
  };

  const inputStyle = {
    fontFamily: 'IBMPlexMono_400Regular',
    fontSize: fontSize.body,
    color: colors.bright,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: spacing.sm,
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          padding: spacing.xl,
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.line,
              borderWidth: 1,
              borderRadius: radius.lg,
              padding: spacing.xl,
              gap: spacing.lg,
            }}
          >
            <Mono size={fontSize.tiny} weight="bold" tracking={2} upper color={colors.mid}>
              {initial ? 'Edit metric' : 'New metric'}
            </Mono>

            <View>
              <Mono size={fontSize.micro} tracking={1.5} upper color={colors.muted}>
                Name
              </Mono>
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder="Bench press"
                placeholderTextColor={colors.muted}
                style={inputStyle}
                autoFocus={!initial}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.lg }}>
              <View style={{ flex: 2 }}>
                <Mono size={fontSize.micro} tracking={1.5} upper color={colors.muted}>
                  Value
                </Mono>
                <TextInput
                  value={value}
                  onChangeText={setValue}
                  placeholder="100"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  style={inputStyle}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Mono size={fontSize.micro} tracking={1.5} upper color={colors.muted}>
                  Unit
                </Mono>
                <TextInput
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="kg"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  style={inputStyle}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm }}>
              {initial && onDelete ? (
                <Button label="Delete" variant="danger" small onPress={onDelete} />
              ) : (
                <View />
              )}
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button label="Cancel" variant="ghost" small onPress={onClose} haptic={false} />
                <Button label="Save" small onPress={submit} disabled={!valid} />
              </View>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
