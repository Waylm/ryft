import { useEffect, useState } from 'react';
import { Modal, View, TextInput, Pressable, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Mono, Serif, Button } from '@/components';
import { useTheme } from '@/theme';
import type { Reminder, ReminderMessage } from '@/db/types';
import { WEEKDAY_LABELS } from '@/lib/date';

export interface ReminderDraft {
  message: string;
  hour: number;
  minute: number;
  daysOfWeek: number[];
}

export function ReminderEditorModal({
  visible,
  initial,
  library,
  onSubmit,
  onDelete,
  onClose,
}: {
  visible: boolean;
  initial: Reminder | null;
  library: ReminderMessage[];
  onSubmit: (draft: ReminderDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const { colors, spacing, fontSize, radius } = useTheme();
  const [message, setMessage] = useState('');
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  useEffect(() => {
    if (!visible) return;
    setMessage(initial?.message ?? '');
    setHour(initial?.hour ?? 8);
    setMinute(initial?.minute ?? 0);
    setDays(initial?.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6]);
  }, [visible, initial]);

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const stepHour = (delta: number) => setHour((h) => (h + delta + 24) % 24);
  const stepMinute = (delta: number) => setMinute((m) => (m + delta + 60) % 60);

  const valid = message.trim().length > 0 && days.length > 0;
  const submit = () => {
    if (!valid) return;
    onSubmit({ message: message.trim(), hour, minute, daysOfWeek: days });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
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
            gap: spacing.xl,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Mono size={fontSize.tiny} weight="bold" tracking={2} upper color={colors.mid}>
              {initial ? 'Edit reminder' : 'New reminder'}
            </Mono>
            <Pressable onPress={onClose} hitSlop={10}>
              <Feather name="x" size={20} color={colors.mid} />
            </Pressable>
          </View>

          {/* Time stepper */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm }}>
            <TimeColumn value={hour} onUp={() => stepHour(1)} onDown={() => stepHour(-1)} />
            <Serif size={fontSize.huge} color={colors.dim} style={{ marginTop: -4 }}>
              :
            </Serif>
            <TimeColumn value={minute} onUp={() => stepMinute(5)} onDown={() => stepMinute(-5)} />
          </View>

          {/* Days */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {WEEKDAY_LABELS.map((lbl, d) => {
              const on = days.includes(d);
              return (
                <Pressable
                  key={d}
                  onPress={() => toggleDay(d)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: on ? colors.accent : 'transparent',
                    borderWidth: 1,
                    borderColor: on ? colors.accent : colors.dim,
                  }}
                >
                  <Mono size={fontSize.small} weight="bold" color={on ? colors.onAccent : colors.muted}>
                    {lbl}
                  </Mono>
                </Pressable>
              );
            })}
          </View>

          {/* Message */}
          <View style={{ gap: spacing.sm }}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Write the line that moves you…"
              placeholderTextColor={colors.muted}
              multiline
              style={{
                fontFamily: 'IBMPlexSerif_400Regular_Italic',
                fontSize: fontSize.lg,
                color: colors.bright,
                borderWidth: 1,
                borderColor: colors.line,
                borderRadius: radius.md,
                padding: spacing.md,
                minHeight: 60,
                textAlignVertical: 'top',
              }}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {library.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setMessage(m.text)}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.dim,
                    borderRadius: radius.md,
                    paddingVertical: 6,
                    paddingHorizontal: spacing.md,
                    maxWidth: 220,
                  }}
                >
                  <Mono size={fontSize.tiny} color={colors.mid} numberOfLines={1}>
                    {m.text}
                  </Mono>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            {initial && onDelete ? (
              <Button label="Delete" variant="danger" small onPress={onDelete} />
            ) : (
              <View />
            )}
            <Button label={initial ? 'Save' : 'Add reminder'} onPress={submit} disabled={!valid} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function TimeColumn({
  value,
  onUp,
  onDown,
}: {
  value: number;
  onUp: () => void;
  onDown: () => void;
}) {
  const { colors, fontSize } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Pressable onPress={onUp} hitSlop={8}>
        <Feather name="chevron-up" size={22} color={colors.mid} />
      </Pressable>
      <Serif size={fontSize.huge} color={colors.bright} style={{ lineHeight: fontSize.huge }}>
        {String(value).padStart(2, '0')}
      </Serif>
      <Pressable onPress={onDown} hitSlop={8}>
        <Feather name="chevron-down" size={22} color={colors.mid} />
      </Pressable>
    </View>
  );
}
