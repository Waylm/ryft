import { useCallback, useEffect, useState } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { Redirect, useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Mono, Serif, Pill, MiniSpine } from '@/components';
import { useTheme } from '@/theme';
import { getKv, listDaySummaries, countDays, getStreak } from '@/db/queries';
import type { DaySummary } from '@/db/types';
import { ONBOARDING_KEY } from '@/lib/flags';
import { DEFAULT_REMINDER_MESSAGES } from '@/db/database';
import { dayOverallStatus, summarySegments, summaryLine } from '@/lib/status';
import { todayISO, weekdayShort, fromISODate, isToday, relativeLabel } from '@/lib/date';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export default function TimelineGate() {
  const db = useSQLiteContext();
  const [state, setState] = useState<'loading' | 'need' | 'ok'>('loading');

  useEffect(() => {
    getKv(db, ONBOARDING_KEY).then((v) => setState(v === '1' ? 'ok' : 'need'));
  }, [db]);

  if (state === 'loading') return null;
  if (state === 'need') return <Redirect href="/onboarding" />;
  return <Timeline />;
}

function Timeline() {
  const theme = useTheme();
  const { colors, spacing, fontSize } = theme;
  const db = useSQLiteContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [days, setDays] = useState<DaySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);

  const load = useCallback(() => {
    const today = todayISO();
    Promise.all([
      listDaySummaries(db, { limit: 120 }),
      countDays(db),
      getStreak(db, today),
    ]).then(([d, c, s]) => {
      setDays(d);
      setTotal(c);
      setStreak(s);
    });
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Deterministic daily quote so it doesn't flicker between renders.
  const quoteIndex = fromISODate(todayISO()).getDate() % DEFAULT_REMINDER_MESSAGES.length;
  const quote = DEFAULT_REMINDER_MESSAGES[quoteIndex];

  const openToday = () => router.push(`/day/${todayISO()}`);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={days}
        keyExtractor={(d) => d.date}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.xl }}>
            {/* Top bar */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Mono size={fontSize.lg} weight="bold" tracking={4} color={colors.bright}>
                RYFT
              </Mono>
              <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                <IconLink icon="target" onPress={() => router.push('/prime')} />
                <IconLink icon="bell" onPress={() => router.push('/reminders')} />
                <IconLink icon="settings" onPress={() => router.push('/settings')} />
              </View>
            </View>

            {/* Streak hero */}
            <View style={{ marginTop: spacing.xxl }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md }}>
                <Serif size={fontSize.huge} color={colors.bright} style={{ lineHeight: fontSize.huge }}>
                  {streak}
                </Serif>
                <Mono
                  size={fontSize.tiny}
                  weight="bold"
                  tracking={2}
                  upper
                  color={colors.mid}
                  style={{ paddingBottom: 10 }}
                >
                  {streak === 1 ? 'day streak' : 'day streak'}
                </Mono>
              </View>
              <Serif
                italic
                size={fontSize.lg}
                color={colors.text}
                style={{ marginTop: spacing.sm }}
              >
                “{quote}”
              </Serif>
              <Mono size={fontSize.tiny} color={colors.muted} style={{ marginTop: spacing.sm }}>
                {total} {total === 1 ? 'day' : 'days'} logged
              </Mono>
            </View>

            {/* Today CTA */}
            <Pressable
              onPress={openToday}
              style={({ pressed }) => ({
                marginTop: spacing.xl,
                backgroundColor: colors.accent,
                borderRadius: theme.radius.md,
                paddingVertical: spacing.lg,
                paddingHorizontal: spacing.lg,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View>
                <Mono size={fontSize.micro} weight="bold" tracking={2} upper color={colors.onAccent}>
                  Today
                </Mono>
                <Mono
                  size={fontSize.label}
                  weight="semibold"
                  color={colors.onAccent}
                  style={{ marginTop: 4, opacity: 0.85 }}
                >
                  Open today's page
                </Mono>
              </View>
              <Feather name="arrow-right" size={22} color={colors.onAccent} />
            </Pressable>

            {/* Section label */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                marginTop: spacing.xxl,
              }}
            >
              <Mono size={fontSize.micro} weight="semibold" tracking={2} upper color={colors.muted}>
                Timeline
              </Mono>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <DayCard summary={item} onPress={() => router.push(`/day/${item.date}`)} />
        )}
        ListEmptyComponent={
          <View
            style={{
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: colors.dim,
              borderRadius: theme.radius.md,
              padding: spacing.xl,
              alignItems: 'center',
            }}
          >
            <Mono size={fontSize.small} color={colors.muted} center>
              No days logged yet.
            </Mono>
            <Mono size={fontSize.small} color={colors.muted} center style={{ marginTop: 4 }}>
              The climb starts with today.
            </Mono>
          </View>
        }
      />
    </View>
  );
}

function IconLink({ icon, onPress }: { icon: keyof typeof Feather.glyphMap; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
      <Feather name={icon} size={20} color={colors.mid} />
    </Pressable>
  );
}

function DayCard({ summary, onPress }: { summary: DaySummary; onPress: () => void }) {
  const theme = useTheme();
  const { colors, spacing, fontSize } = theme;
  const d = fromISODate(summary.date);
  const status = dayOverallStatus(summary);
  const today = isToday(summary.date);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: spacing.lg,
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {/* Date column */}
      <View style={{ width: 52 }}>
        <Mono size={fontSize.micro} weight="bold" tracking={1.5} color={colors.muted}>
          {weekdayShort(summary.date)}
        </Mono>
        <Serif size={fontSize.xl} color={colors.bright} style={{ lineHeight: fontSize.xl * 1.1 }}>
          {String(d.getDate()).padStart(2, '0')}
        </Serif>
        <Mono size={fontSize.micro} color={colors.muted} tracking={1}>
          {MONTHS[d.getMonth()]}
        </Mono>
      </View>

      {/* Body */}
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Pill label={today ? 'Today' : relativeLabel(summary.date)} status={status} />
          {summary.isPrime ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Feather name="star" size={11} color={colors.bright} />
              <Mono size={fontSize.micro} weight="bold" tracking={1.5} upper color={colors.bright}>
                Prime
              </Mono>
            </View>
          ) : null}
        </View>
        <MiniSpine segments={summarySegments(summary)} />
        <Mono size={fontSize.tiny} color={colors.mid}>
          {summaryLine(summary)}
        </Mono>
      </View>

      <View style={{ justifyContent: 'center' }}>
        <Feather name="chevron-right" size={18} color={colors.dim} />
      </View>
    </Pressable>
  );
}
