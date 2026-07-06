import { useCallback, useState } from 'react';
import { View, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Mono, Serif, Button, Toggle } from '@/components';
import { SectionLabel } from '@/components/SectionLabel';
import { PromptModal } from '@/components/PromptModal';
import { ReminderEditorModal, type ReminderDraft } from '@/components/reminders/ReminderEditorModal';
import { useTheme } from '@/theme';
import {
  addReminder,
  addReminderMessage,
  deleteReminder,
  deleteReminderMessage,
  getReminder,
  listReminderMessages,
  listReminders,
  updateReminder,
} from '@/db/queries';
import type { Reminder, ReminderMessage } from '@/db/types';
import {
  getPermissionStatus,
  requestNotificationPermission,
  scheduleReminder,
  unscheduleReminder,
} from '@/lib/notifications';
import { WEEKDAY_FULL } from '@/lib/date';

export default function RemindersScreen() {
  const theme = useTheme();
  const { colors, spacing, fontSize } = theme;
  const router = useRouter();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [library, setLibrary] = useState<ReminderMessage[]>([]);
  const [granted, setGranted] = useState(true);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [addLineOpen, setAddLineOpen] = useState(false);

  const load = useCallback(() => {
    Promise.all([listReminders(db), listReminderMessages(db), getPermissionStatus()]).then(
      ([r, l, g]) => {
        setReminders(r);
        setLibrary(l);
        setGranted(g);
      }
    );
  }, [db]);

  useFocusEffect(useCallback(() => load(), [load]));

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (r: Reminder) => {
    setEditing(r);
    setEditorOpen(true);
  };

  const submit = async (draft: ReminderDraft) => {
    const permitted = await requestNotificationPermission();
    setGranted(permitted);
    if (editing) {
      await updateReminder(db, editing.id, { ...draft, enabled: editing.enabled && permitted });
      const r = await getReminder(db, editing.id);
      if (r) await scheduleReminder(db, r);
    } else {
      const id = await addReminder(db, { ...draft, enabled: permitted });
      const r = await getReminder(db, id);
      if (r) await scheduleReminder(db, r);
    }
    setEditorOpen(false);
    load();
  };

  const remove = async () => {
    if (!editing) return;
    await unscheduleReminder(db, editing.id);
    await deleteReminder(db, editing.id);
    setEditorOpen(false);
    load();
  };

  const toggleEnabled = async (r: Reminder) => {
    const next = !r.enabled;
    if (next) {
      const permitted = await requestNotificationPermission();
      setGranted(permitted);
      if (!permitted) {
        Alert.alert('Notifications off', 'Enable notifications for Ryft in system settings.');
        return;
      }
    }
    await updateReminder(db, r.id, { enabled: next });
    const updated = await getReminder(db, r.id);
    if (updated) await scheduleReminder(db, updated);
    load();
  };

  const addLine = async (text: string) => {
    await addReminderMessage(db, text);
    setAddLineOpen(false);
    load();
  };

  const deleteLine = (m: ReminderMessage) => {
    Alert.alert('Delete line', `Remove "${m.text}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteReminderMessage(db, m.id);
          load();
        },
      },
    ]);
  };

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
          Reminders
        </Mono>
        <Serif size={fontSize.xl} color={colors.bright} style={{ marginTop: spacing.sm }}>
          Words that get you moving.
        </Serif>

        {!granted && reminders.length > 0 ? (
          <View
            style={{
              marginTop: spacing.lg,
              borderWidth: 1,
              borderColor: colors.dim,
              borderRadius: theme.radius.md,
              padding: spacing.md,
            }}
          >
            <Mono size={fontSize.tiny} color={colors.muted}>
              Notifications are off — reminders won't fire. Enable them in system settings.
            </Mono>
          </View>
        ) : null}

        {/* Reminders list */}
        <View style={{ marginTop: spacing.xxl }}>
          <SectionLabel
            right={
              <Pressable onPress={openNew} hitSlop={8}>
                <Feather name="plus" size={16} color={colors.mid} />
              </Pressable>
            }
          >
            Scheduled
          </SectionLabel>

          {reminders.length === 0 ? (
            <Pressable onPress={openNew}>
              <View
                style={{
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: colors.dim,
                  borderRadius: theme.radius.md,
                  padding: spacing.xl,
                }}
              >
                <Mono size={fontSize.small} color={colors.muted}>
                  + Set a reminder. Pick a time, choose your days, write the line that bites.
                </Mono>
              </View>
            </Pressable>
          ) : (
            <View style={{ gap: spacing.md }}>
              {reminders.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => openEdit(r)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.lg,
                    paddingVertical: spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.line,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Serif
                    size={fontSize.xl}
                    color={r.enabled ? colors.bright : colors.muted}
                    style={{ width: 76 }}
                  >
                    {formatTime(r.hour, r.minute)}
                  </Serif>
                  <View style={{ flex: 1 }}>
                    <Mono
                      size={fontSize.small}
                      color={r.enabled ? colors.text : colors.muted}
                      numberOfLines={1}
                    >
                      {r.message}
                    </Mono>
                    <Mono size={fontSize.micro} color={colors.muted} tracking={1} upper style={{ marginTop: 3 }}>
                      {formatDays(r.daysOfWeek)}
                    </Mono>
                  </View>
                  <Toggle on={r.enabled} onPress={() => toggleEnabled(r)} />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Message library */}
        <View style={{ marginTop: spacing.xxl }}>
          <SectionLabel
            right={
              <Pressable onPress={() => setAddLineOpen(true)} hitSlop={8}>
                <Feather name="plus" size={16} color={colors.mid} />
              </Pressable>
            }
          >
            Your Lines
          </SectionLabel>
          <View style={{ gap: spacing.sm }}>
            {library.map((m) => (
              <View
                key={m.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: spacing.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.line,
                }}
              >
                <Serif italic size={fontSize.body} color={colors.text} style={{ flex: 1 }}>
                  “{m.text}”
                </Serif>
                {m.isCustom ? (
                  <Pressable onPress={() => deleteLine(m)} hitSlop={8} style={{ paddingLeft: spacing.md }}>
                    <Feather name="x" size={14} color={colors.dim} />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <ReminderEditorModal
        visible={editorOpen}
        initial={editing}
        library={library}
        onSubmit={submit}
        onDelete={editing ? remove : undefined}
        onClose={() => setEditorOpen(false)}
      />
      <PromptModal
        visible={addLineOpen}
        title="New line"
        placeholder="You said you would change."
        onSubmit={addLine}
        onClose={() => setAddLineOpen(false)}
      />
    </View>
  );
}

function formatTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDays(days: number[]): string {
  if (days.length === 7) return 'Every day';
  const sorted = [...days].sort();
  if (sorted.join(',') === '1,2,3,4,5') return 'Weekdays';
  if (sorted.join(',') === '0,6') return 'Weekends';
  return sorted.map((d) => WEEKDAY_FULL[d].slice(0, 3)).join(', ');
}
