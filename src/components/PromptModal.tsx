import { useEffect, useState } from 'react';
import { Modal, View, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Mono, Button } from '@/components';
import { useTheme } from '@/theme';

export function PromptModal({
  visible,
  title,
  placeholder,
  initialValue = '',
  submitLabel = 'Add',
  onSubmit,
  onClose,
}: {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  onSubmit: (text: string) => void;
  onClose: () => void;
}) {
  const { colors, spacing, fontSize, radius } = useTheme();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const submit = () => {
    const t = value.trim();
    if (!t) return;
    onSubmit(t);
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
              {title}
            </Mono>
            <TextInput
              value={value}
              onChangeText={setValue}
              onSubmitEditing={submit}
              placeholder={placeholder}
              placeholderTextColor={colors.muted}
              autoFocus
              returnKeyType="done"
              style={{
                fontFamily: 'IBMPlexMono_400Regular',
                fontSize: fontSize.body,
                color: colors.bright,
                borderBottomWidth: 1,
                borderBottomColor: colors.line,
                paddingVertical: spacing.sm,
              }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm }}>
              <Button label="Cancel" variant="ghost" small onPress={onClose} haptic={false} />
              <Button label={submitLabel} small onPress={submit} disabled={!value.trim()} />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
