import { useEffect, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Feather } from '@expo/vector-icons';
import { Mono, Serif } from '@/components/Typography';
import { SectionLabel } from '@/components/SectionLabel';
import { useTheme } from '@/theme';
import type { Metric } from '@/db/types';
import { addMetric, deleteMetric, listMetricKeys, updateMetric } from '@/db/queries';
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
  const { colors, spacing, fontSize, radius } = useTheme();
  const [editing, setEditing] = useState<Metric | null>(null);
  const [preset, setPreset] = useState<{ label: string; unit: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<{ key: string; label: string; unit: string }[]>([]);

  useEffect(() => {
    listMetricKeys(db).then(setSuggestions);
  }, [db, metrics.length]);

  const usedKeys = new Set(metrics.map((m) => m.key));
  const freshSuggestions = suggestions.filter((s) => !usedKeys.has(s.key)).slice(0, 6);

  const openNew = () => {
    setEditing(null);
    setPreset(null);
    setOpen(true);
  };
  const openPreset = (s: { label: string; unit: string }) => {
    setEditing(null);
    setPreset(s);
    setOpen(true);
  };
  const openEdit = (m: Metric) => {
    setEditing(m);
    setPreset(null);
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

      {freshSuggestions.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
          style={{ marginTop: spacing.md }}
        >
          {freshSuggestions.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => openPreset(s)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderWidth: 1,
                borderColor: colors.dim,
                borderRadius: radius.md,
                paddingVertical: 6,
                paddingHorizontal: spacing.md,
              }}
            >
              <Feather name="plus" size={11} color={colors.muted} />
              <Mono size={fontSize.tiny} color={colors.mid}>
                {s.label}
              </Mono>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <MetricEditorModal
        visible={open}
        initial={editing}
        preset={preset}
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
