import { useCallback, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Mono, Serif } from '@/components';
import { SectionLabel } from '@/components/SectionLabel';
import { useTheme } from '@/theme';
import {
  getMetricStats,
  listPrimeDays,
  getStreakStats,
  getOutputStat,
  getAdherenceRows,
} from '@/db/queries';
import type { Day, MetricStat } from '@/db/types';
import {
  comparePrime,
  primeLine,
  overallHeadline,
  buildStreakDimension,
  buildOutputDimension,
  buildAdherenceDimension,
  type PrimeComparison,
  type PrimeDimension,
} from '@/lib/prime';
import { formatSlashDate, relativeLabel, weekdayShort, todayISO } from '@/lib/date';

export default function PrimeScreen() {
  const theme = useTheme();
  const { colors, spacing, fontSize, radius } = theme;
  const router = useRouter();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState<MetricStat[]>([]);
  const [primeDays, setPrimeDays] = useState<Day[]>([]);
  const [dimensions, setDimensions] = useState<PrimeDimension[]>([]);

  useFocusEffect(
    useCallback(() => {
      const today = todayISO();
      Promise.all([
        getMetricStats(db),
        listPrimeDays(db),
        getStreakStats(db, today),
        getOutputStat(db),
        getAdherenceRows(db),
      ]).then(([s, d, streak, output, adherence]) => {
        setStats(s);
        setPrimeDays(d);
        setDimensions(
          [
            buildStreakDimension(streak),
            buildOutputDimension(output),
            buildAdherenceDimension(adherence),
          ].filter((x): x is PrimeDimension => x !== null)
        );
      });
    }, [db])
  );

  const comparisons = stats.map(comparePrime);
  const headline = overallHeadline(comparisons, dimensions);

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
        {/* Top bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl }}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="chevron-left" size={24} color={colors.mid} />
          </Pressable>
        </View>

        {/* Header */}
        <Mono size={fontSize.tiny} weight="bold" tracking={3} upper color={colors.accent}>
          You vs Your Prime
        </Mono>
        <Serif
          size={fontSize.xl}
          color={colors.bright}
          style={{ marginTop: spacing.md, lineHeight: fontSize.xl * 1.3 }}
        >
          {headline}
        </Serif>

        {/* Signals — prime beyond numeric metrics */}
        {dimensions.length > 0 ? (
          <View style={{ marginTop: spacing.xxl }}>
            <SectionLabel>Signals</SectionLabel>
            <View style={{ gap: spacing.lg }}>
              {dimensions.map((d) => (
                <DimensionCard key={d.key} d={d} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Metric comparisons */}
        <View style={{ marginTop: spacing.xxl }}>
          <SectionLabel>Metrics</SectionLabel>
          {comparisons.length === 0 ? (
            <View
              style={{
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: colors.dim,
                borderRadius: radius.md,
                padding: spacing.xl,
              }}
            >
              <Mono size={fontSize.small} color={colors.muted}>
                No numbers yet. Log a metric on any day — bench, weight, run time — and Ryft starts
                tracking your peak.
              </Mono>
            </View>
          ) : (
            <View style={{ gap: spacing.lg }}>
              {comparisons.map((c) => (
                <PrimeMetricCard key={c.stat.key} c={c} />
              ))}
            </View>
          )}
        </View>

        {/* Pinned prime days */}
        <View style={{ marginTop: spacing.xxl }}>
          <SectionLabel>Prime Days</SectionLabel>
          {primeDays.length === 0 ? (
            <Mono size={fontSize.small} color={colors.muted}>
              Star a standout day (☆ on any page) to pin it here as a prime day.
            </Mono>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {primeDays.map((d) => (
                <Pressable
                  key={d.id}
                  onPress={() => router.push(`/day/${d.date}`)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.line,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <Feather name="star" size={13} color={colors.accent} />
                    <Mono size={fontSize.label} color={colors.bright}>
                      {weekdayShort(d.date)} · {formatSlashDate(d.date)}
                    </Mono>
                  </View>
                  <Mono size={fontSize.tiny} color={colors.muted}>
                    {relativeLabel(d.date)}
                  </Mono>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function DimensionCard({ d }: { d: PrimeDimension }) {
  const { colors, spacing, fontSize, radius } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        borderLeftWidth: 3,
        borderLeftColor: d.atPrime ? colors.accent : colors.dim,
        borderRadius: radius.md,
        padding: spacing.lg,
        gap: spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Mono size={fontSize.label} weight="semibold" color={colors.bright}>
          {d.label}
        </Mono>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Serif size={fontSize.xl} color={colors.bright}>
            {d.current}
          </Serif>
          {d.unit ? (
            <Mono size={fontSize.tiny} color={colors.mid}>
              {d.unit}
            </Mono>
          ) : null}
        </View>
      </View>

      <View style={{ height: 4, backgroundColor: colors.surfaceAlt, borderRadius: 2 }}>
        <View
          style={{
            width: `${Math.round(d.ratio * 100)}%`,
            height: 4,
            backgroundColor: d.atPrime ? colors.accent : colors.mid,
            borderRadius: 2,
          }}
        />
      </View>

      <Mono size={fontSize.tiny} color={colors.mid}>
        {d.line}
      </Mono>
      {d.caption ? (
        <Mono size={fontSize.micro} color={colors.muted} tracking={0.5}>
          {d.caption}
        </Mono>
      ) : null}
    </View>
  );
}

function PrimeMetricCard({ c }: { c: PrimeComparison }) {
  const { colors, spacing, fontSize, radius } = useTheme();
  const { stat } = c;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        borderLeftWidth: 3,
        borderLeftColor: c.atPrime ? colors.accent : colors.dim,
        borderRadius: radius.md,
        padding: spacing.lg,
        gap: spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Mono size={fontSize.label} weight="semibold" color={colors.bright}>
          {stat.label}
        </Mono>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Serif size={fontSize.xl} color={colors.bright}>
            {fmt(stat.latest)}
          </Serif>
          <Mono size={fontSize.tiny} color={colors.mid}>
            {stat.unit}
          </Mono>
        </View>
      </View>

      {/* progress toward peak */}
      <View style={{ height: 4, backgroundColor: colors.surfaceAlt, borderRadius: 2 }}>
        <View
          style={{
            width: `${Math.round(c.ratio * 100)}%`,
            height: 4,
            backgroundColor: c.atPrime ? colors.accent : colors.mid,
            borderRadius: 2,
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Mono size={fontSize.tiny} color={colors.mid}>
          {primeLine(c)}
        </Mono>
      </View>
      <Mono size={fontSize.micro} color={colors.muted} tracking={0.5}>
        PRIME {fmt(stat.peak)}
        {stat.unit} · {relativeLabel(stat.peakDate)}
      </Mono>
    </View>
  );
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
