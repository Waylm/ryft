import { useState } from 'react';
import { View, Pressable } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Feather } from '@expo/vector-icons';
import { Mono, Serif } from '@/components/Typography';
import { SectionLabel } from '@/components/SectionLabel';
import { useTheme } from '@/theme';
import type { Metric } from '@/db/types';
import { addMetric, deleteMetric, updateMetric } from '@/db/queries';
import { MetricEditorModal, type MetricDraft } from './MetricEditorModal';

export function MetricsBlock({
  dayId,
  metrics,
  db,
  onChange,
}: {
  dayId: number;
  metrics: Metric[];
  db: SQLiteDatabase;
  onChange: () => void;
}) {
  const { colors, spacing, fontSize } = useTheme();
  const [editing, setEditing] = useState<Metric | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (m: Metric) => {
    setEditing(m);
    setOpen(true);
  };

  const submit = async (draft: MetricDraft) => {
    if (editing) {
      await updateMetric(db, editing.id, {
        label: draft.label,
        value: draft.value,
        unit: draft.unit,
      });
    } else {
      await addMetric(db, dayId, draft);
    }
    setOpen(false);
    onChange();
  };

  const remove = async () => {
    if (editing) await deleteMetric(db, editing.id);
    setOpen(false);
    onChange();
  };

  return (
    <View style={{ marginBottom: spacing.xxl }}>
      <SectionLabel
        right={
          <Pressable onPress={openNew} hitSlop={8}>
            <Feather name="plus" size={15} color={colors.mid} />
          </Pressable>
        }
      >
        Metrics
      </SectionLabel>

      {metrics.length === 0 ? (
        <Pressable onPress={openNew}>
          <Mono size={fontSize.small} color={colors.muted}>
            + Log a number — bench, weight, run time. This powers your prime.
          </Mono>
        </Pressable>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {metrics.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => openEdit(m)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                paddingVertical: spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: colors.line,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Mono size={fontSize.label} color={colors.text}>
                {m.label}
              </Mono>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Serif size={fontSize.lg} color={colors.bright}>
                  {formatValue(m.value)}
                </Serif>
                {m.unit ? (
                  <Mono size={fontSize.tiny} color={colors.mid}>
                    {m.unit}
                  </Mono>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <MetricEditorModal
        visible={open}
        initial={editing}
        onSubmit={submit}
        onDelete={editing ? remove : undefined}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

function formatValue(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
