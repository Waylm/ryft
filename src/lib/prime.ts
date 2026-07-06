import type { AdherenceRow, MetricStat, OutputStat, StreakStats } from '@/db/types';
import { daysBetween, relativeLabel, todayISO } from './date';

export interface PrimeComparison {
  stat: MetricStat;
  /** peak - latest, in the metric's unit. Positive means you're below your prime. */
  gap: number;
  /** latest / peak as a 0..1 ratio (clamped). */
  ratio: number;
  atPrime: boolean;
  /** How far, as a percentage, latest sits below peak (0 when at/above prime). */
  deficitPct: number;
}

export function comparePrime(stat: MetricStat): PrimeComparison {
  const gap = stat.peak - stat.latest;
  const ratio = stat.peak > 0 ? Math.min(1, Math.max(0, stat.latest / stat.peak)) : 0;
  // A non-positive peak (metric only ever logged as 0/negative) isn't a "prime".
  const atPrime = stat.peak > 0 && stat.latest >= stat.peak;
  const deficitPct = stat.peak > 0 ? Math.max(0, (gap / stat.peak) * 100) : 0;
  return { stat, gap, ratio, atPrime, deficitPct };
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** A short, punchy line comparing today's you to your prime for one metric. */
export function primeLine(c: PrimeComparison): string {
  const { stat, gap, atPrime } = c;
  const unit = stat.unit ? stat.unit : '';
  const unitSuffix = unit ? unit : '';
  if (atPrime) {
    if (stat.latest > stat.peak) {
      return `New prime. ${fmt(stat.latest)}${unitSuffix} — higher than you've ever been.`;
    }
    return `At your prime. ${fmt(stat.latest)}${unitSuffix}. Hold the line.`;
  }
  return `${fmt(gap)}${unitSuffix} off your prime of ${fmt(stat.peak)}${unitSuffix}. Close the gap.`;
}

// ---------------------------------------------------------------------------
// Prime dimensions beyond numeric metrics (consistency, output, discipline)
// ---------------------------------------------------------------------------

/** A non-metric prime signal, shaped for the same card UI as metric peaks. */
export interface PrimeDimension {
  key: string;
  label: string;
  unit: string;
  current: number;
  peak: number;
  ratio: number;
  atPrime: boolean;
  line: string;
  caption: string | null;
}

/** Consistency: current streak vs all-time longest. Hidden until there's real history. */
export function buildStreakDimension(s: StreakStats): PrimeDimension | null {
  if (s.longest < 2 || s.activeDayCount < 5) return null;
  const ratio = s.longest > 0 ? Math.min(1, s.current / s.longest) : 0;
  const atPrime = s.current > 0 && s.current >= s.longest;
  let line: string;
  if (atPrime) {
    line = `${s.current} days — the longest run of your life, right now. Hold the line.`;
  } else if (s.current === 0) {
    line = `Your prime run was ${s.longest} days. Start it again today.`;
  } else {
    line = `Prime run: ${s.longest} days. You're on ${s.current} — ${s.longest - s.current} to tie your record.`;
  }
  const caption = s.longestEndDate
    ? `PRIME ${s.longest} days · ended ${relativeLabel(s.longestEndDate)}`
    : null;
  return { key: 'streak', label: 'Consistency', unit: 'days', current: s.current, peak: s.longest, ratio, atPrime, line, caption };
}

/** Daily output: peak day vs recent average. Freezes the compare when dormant. */
export function buildOutputDimension(o: OutputStat): PrimeDimension | null {
  if (o.outputDayCount < 10) return null;
  const daysSince = o.mostRecentDate ? daysBetween(todayISO(), o.mostRecentDate) : Infinity;
  const dormant = daysSince > 10;
  const current = Math.round(o.recentAvg);
  const ratio = o.peak > 0 ? Math.min(1, o.recentAvg / o.peak) : 0;
  const atPrime = !dormant && o.mostRecentExecuted >= o.peak;
  let line: string;
  if (dormant) {
    line = `It's been ${daysSince} days since you logged. The gap starts closing today.`;
  } else if (atPrime) {
    line = `New prime — ${o.peak} in a day, more than you've ever done.`;
  } else {
    line = `Your prime day executed ${o.peak}. Lately ~${current}/day. Show up bigger.`;
  }
  const caption = o.peakDate ? `PRIME ${o.peak} · ${relativeLabel(o.peakDate)}` : null;
  return { key: 'output', label: 'Daily output', unit: '/day', current, peak: o.peak, ratio, atPrime, line, caption };
}

/** Follow-through: best vs current checklist completion over trailing 14-day windows. */
export function buildAdherenceDimension(rows: AdherenceRow[]): PrimeDimension | null {
  const MIN_ITEMS = 7;
  const WINDOW = 14;
  let peakRate = -1;
  let peakEnd: string | null = null;
  let currentRate = -1;

  for (let i = 0; i < rows.length; i++) {
    const endDate = rows[i].date;
    let done = 0;
    let total = 0;
    for (let j = 0; j <= i; j++) {
      const diff = daysBetween(endDate, rows[j].date);
      if (diff >= 0 && diff < WINDOW) {
        done += rows[j].done;
        total += rows[j].total;
      }
    }
    if (total >= MIN_ITEMS) {
      const rate = done / total;
      if (rate > peakRate) {
        peakRate = rate;
        peakEnd = endDate;
      }
      currentRate = rate; // rows ascending → last qualifying window is the most recent
    }
  }

  // Hide entirely if there's no qualifying window, or the best-ever rate is 0%
  // (never celebrate "tightest you've ever held the line — 0%").
  if (peakRate <= 0 || currentRate < 0) return null;
  const curPct = Math.round(currentRate * 100);
  const peakPct = Math.round(peakRate * 100);
  const ratio = peakRate > 0 ? Math.min(1, currentRate / peakRate) : 0;
  const atPrime = currentRate >= peakRate;
  const line = atPrime
    ? `Tightest you've ever held the line — ${curPct}%.`
    : `At your prime you closed ${peakPct}% of your checklist. Lately: ${curPct}%. Keep your word.`;
  const caption = peakEnd ? `PRIME ${peakPct}% · to ${relativeLabel(peakEnd)}` : null;
  return { key: 'adherence', label: 'Follow-through', unit: '%', current: curPct, peak: peakPct, ratio, atPrime, line, caption };
}

/** Overall headline across every visible prime signal (metrics + dimensions). */
export function overallHeadline(
  comparisons: PrimeComparison[],
  dimensions: PrimeDimension[]
): string {
  const flags = [...comparisons.map((c) => c.atPrime), ...dimensions.map((d) => d.atPrime)];
  if (flags.length === 0) {
    return 'Keep logging — Ryft is still learning what your prime looks like.';
  }
  const atPrime = flags.filter(Boolean).length;
  if (atPrime === flags.length) {
    return 'Every front is at or above your prime. This is the top. Stay here.';
  }
  if (atPrime === 0) {
    return 'You are below your prime on every front. Today is where the climb starts.';
  }
  return `${atPrime} of ${flags.length} at your prime. Drag the rest up.`;
}
