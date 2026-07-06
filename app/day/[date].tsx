import { useRef, useState } from 'react';
import { View, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Mono, Serif } from '@/components';
import { PromptModal } from '@/components/PromptModal';
import { Spine } from '@/components/Spine';
import { ChecklistBlock } from '@/components/day/ChecklistBlock';
import { TextSectionBlock } from '@/components/day/TextSectionBlock';
import { FocusBlock } from '@/components/day/FocusBlock';
import { MetricsBlock } from '@/components/day/MetricsBlock';
import { PhotosBlock } from '@/components/day/PhotosBlock';
import { useTheme } from '@/theme';
import { useDayData } from '@/hooks/useDayData';
import { addChecklist, addFocusBlock, addTextSection, deleteDay, updateDayFields } from '@/db/queries';
import { buildDaySpine, dayOverallStatus } from '@/lib/status';
import type { DaySummary } from '@/db/types';
import { todayISO, weekdayLong, formatSlashDate, isToday, relativeLabel } from '@/lib/date';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type AddKind = 'checklist' | 'text' | 'focus' | null;

export default function DayScreen() {
  const theme = useTheme();
  const { colors, spacing, fontSize } = theme;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date: string }>();
  const date = DATE_RE.test(params.date ?? '') ? params.date : todayISO();

  const data = useDayData(date);
  const { db, day, checklists, sections, focusBlocks, metrics, photos } = data;

  const [note, setNote] = useState('');
  const noteDirty = useRef(false);
  const noteInit = useRef(false);
  const [addKind, setAddKind] = useState<AddKind>(null);

  // Seed the note field once the day loads.
  if (day && !noteInit.current) {
    noteInit.current = true;
    setNote(day.note ?? '');
  }

  const saveNote = async () => {
    if (!day || !noteDirty.current) return;
    noteDirty.current = false;
    await updateDayFields(db, day.id, { note });
    data.reload();
  };

  const togglePrime = async () => {
    if (!day) return;
    const next = !day.isPrime;
    data.setDay({ ...day, isPrime: next });
    await updateDayFields(db, day.id, { isPrime: next });
  };

  const confirmDeleteDay = () => {
    if (!day) return;
    Alert.alert('Delete this day', 'This erases everything logged on this date.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteDay(db, day.id);
          router.back();
        },
      },
    ]);
  };

  const submitAdd = async (label: string) => {
    if (!day) return;
    if (addKind === 'checklist') await addChecklist(db, day.id, label);
    else if (addKind === 'text') await addTextSection(db, day.id, label);
    else if (addKind === 'focus') await addFocusBlock(db, day.id, label);
    setAddKind(null);
    data.reload();
  };

  const spineSegments = buildDaySpine({ checklists, sections, focusBlocks, metrics, photos });

  // Build a lightweight summary just for the status pill.
  const sectionCount = sections.filter((s) => s.content.trim()).length;
  const focusCount = focusBlocks.reduce((n, f) => n + f.areas.length, 0);
  const checklistDone = checklists.reduce((n, c) => n + c.items.filter((i) => i.done).length, 0);
  const pillStatus = day
    ? dayOverallStatus({
        ...day,
        sectionCount,
        metricCount: metrics.length,
        photoCount: photos.length,
        focusCount,
        checklistTotal: checklists.reduce((n, c) => n + c.items.length, 0),
        checklistDone,
        executedCount: checklistDone + sectionCount + metrics.length + focusCount,
      } as DaySummary)
    : 'skip';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + spacing.xxxl,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.xl,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="chevron-left" size={24} color={colors.mid} />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: spacing.xl }}>
            <Pressable onPress={togglePrime} hitSlop={10}>
              <Feather
                name="star"
                size={20}
                color={day?.isPrime ? colors.accent : colors.dim}
              />
            </Pressable>
            <Pressable onPress={confirmDeleteDay} hitSlop={10}>
              <Feather name="trash-2" size={18} color={colors.dim} />
            </Pressable>
          </View>
        </View>

        {/* Header */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: spacing.lg, marginBottom: spacing.xl }}>
          <Mono size={fontSize.tiny} weight="bold" tracking={3} upper color={colors.accent}>
            Ryft Journal
          </Mono>
          <Serif size={fontSize.display} color={colors.bright} style={{ marginTop: spacing.sm, lineHeight: fontSize.display }}>
            {weekdayLong(date)}
          </Serif>
          <Mono size={fontSize.small} color={colors.muted} tracking={1} style={{ marginTop: 4 }}>
            {formatSlashDate(date)}
          </Mono>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'center' }}>
            <StatusText status={pillStatus} label={isToday(date) ? 'Today' : relativeLabel(date)} />
            {day?.isPrime ? <StatusText status="done" label="★ Prime" /> : null}
          </View>
        </View>

        {/* Note */}
        <View style={{ marginBottom: spacing.xl }}>
          <TextInput
            value={note}
            onChangeText={(t) => {
              noteDirty.current = true;
              setNote(t);
            }}
            onBlur={saveNote}
            multiline
            placeholder="How was today? One honest line…"
            placeholderTextColor={colors.muted}
            style={{
              fontFamily: theme.fonts.serif.italic,
              fontSize: fontSize.lg,
              lineHeight: fontSize.lg * 1.5,
              color: colors.text,
              minHeight: 30,
              textAlignVertical: 'top',
            }}
          />
        </View>

        {/* Spine + blocks */}
        <View style={{ flexDirection: 'row', gap: spacing.xl }}>
          <Spine segments={spineSegments} minSegmentHeight={44} />
          <View style={{ flex: 1 }}>
            {checklists.map((c) => (
              <ChecklistBlock key={`c${c.id}`} checklist={c} db={db} onChange={data.reload} />
            ))}
            {sections.map((s) => (
              <TextSectionBlock key={`s${s.id}`} section={s} db={db} onChange={data.reload} />
            ))}
            {focusBlocks.map((f) => (
              <FocusBlock key={`f${f.id}`} block={f} db={db} onChange={data.reload} />
            ))}
            {day ? (
              <MetricsBlock dayId={day.id} metrics={metrics} db={db} onChange={data.reload} />
            ) : null}
            {day ? (
              <PhotosBlock dayId={day.id} photos={photos} db={db} onChange={data.reload} />
            ) : null}
          </View>
        </View>

        {/* Add block */}
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.md,
            marginTop: spacing.md,
            paddingLeft: 3 + spacing.xl,
          }}
        >
          <AddChip icon="check-square" label="Checklist" onPress={() => setAddKind('checklist')} />
          <AddChip icon="align-left" label="Text" onPress={() => setAddKind('text')} />
          <AddChip icon="target" label="Focus" onPress={() => setAddKind('focus')} />
        </View>
      </ScrollView>

      <PromptModal
        visible={addKind !== null}
        title={
          addKind === 'checklist'
            ? 'New checklist'
            : addKind === 'focus'
              ? 'New focus'
              : 'New text section'
        }
        placeholder={
          addKind === 'checklist'
            ? 'Skincare, Morning routine…'
            : addKind === 'focus'
              ? 'Workout, Study…'
              : 'Ideas, Executed…'
        }
        onSubmit={submitAdd}
        onClose={() => setAddKind(null)}
      />
    </View>
  );
}

function StatusText({ status, label }: { status: 'done' | 'partial' | 'skip'; label: string }) {
  const { colors, fontSize } = useTheme();
  const color =
    status === 'done' ? colors.bright : status === 'partial' ? colors.mid : colors.muted;
  return (
    <Mono size={fontSize.micro} weight="semibold" tracking={1.5} upper color={color}>
      {label}
    </Mono>
  );
}

function AddChip({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors, spacing, fontSize, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: colors.dim,
        borderRadius: radius.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Feather name={icon} size={13} color={colors.mid} />
      <Mono size={fontSize.tiny} weight="semibold" tracking={1} upper color={colors.mid}>
        {label}
      </Mono>
    </Pressable>
  );
}
