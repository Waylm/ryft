import type { MetricStat } from '@/db/types';

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
  const atPrime = stat.latest >= stat.peak;
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

/** Overall headline across all tracked metrics for the prime screen. */
export function primeHeadline(comparisons: PrimeComparison[]): string {
  if (comparisons.length === 0) {
    return 'Log a number to start measuring against your prime.';
  }
  const atPrime = comparisons.filter((c) => c.atPrime).length;
  if (atPrime === comparisons.length) {
    return 'Every number is at or above your prime. This is the top. Stay here.';
  }
  if (atPrime === 0) {
    return 'You are below your prime on every front. Today is where the climb starts.';
  }
  return `${atPrime} of ${comparisons.length} at your prime. Drag the rest up.`;
}
