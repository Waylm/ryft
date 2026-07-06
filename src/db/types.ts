// Domain types for Ryft's local journal. Mirrors the SQLite schema in database.ts.

export interface Day {
  id: number;
  date: string; // YYYY-MM-DD (device-local calendar date)
  title: string | null;
  note: string | null;
  isPrime: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TextSection {
  id: number;
  dayId: number;
  label: string;
  content: string;
  position: number;
}

export interface ChecklistItem {
  id: number;
  checklistId: number;
  text: string;
  done: boolean;
  position: number;
}

/** 'check' = tickable checklist (Skincare); 'list' = plain bulleted log (Executed). */
export type ChecklistKind = 'check' | 'list';

export interface Checklist {
  id: number;
  dayId: number;
  label: string;
  kind: ChecklistKind;
  position: number;
  items: ChecklistItem[];
}

/** One entry in the user's journal template — what new days are seeded with. */
export type TemplateItemType = 'checklist' | 'text' | 'list' | 'focus' | 'metrics' | 'photos';

export interface TemplateItem {
  id: number;
  type: TemplateItemType;
  label: string;
  enabled: boolean;
  position: number;
}

/** Intensity a focus area got that day: 1 = light, 2 = solid, 3 = heavy. */
export type FocusIntensity = 1 | 2 | 3;

export interface FocusArea {
  id: number;
  focusBlockId: number;
  label: string;
  intensity: FocusIntensity;
  position: number;
}

export interface FocusBlock {
  id: number;
  dayId: number;
  label: string;
  position: number;
  areas: FocusArea[];
}

export interface Metric {
  id: number;
  dayId: number;
  key: string; // normalized key, e.g. "bench"
  label: string; // display label, e.g. "Bench Press"
  value: number;
  unit: string;
  position: number;
}

export interface Photo {
  id: number;
  dayId: number;
  uri: string;
  caption: string | null;
  position: number;
  createdAt: number;
}

export interface Reminder {
  id: number;
  message: string;
  hour: number; // 0-23
  minute: number; // 0-59
  daysOfWeek: number[]; // 0=Sun .. 6=Sat
  enabled: boolean;
  createdAt: number;
}

export interface ReminderMessage {
  id: number;
  text: string;
  isCustom: boolean;
}

/** A day plus lightweight rollups used to render the timeline without loading every child row. */
export interface DaySummary extends Day {
  sectionCount: number;
  metricCount: number;
  photoCount: number;
  focusCount: number;
  checklistTotal: number;
  checklistDone: number;
  executedCount: number; // items done + filled sections + focus areas + metrics — a rough "did work" signal
}

/** Aggregated stats for one metric key across all time — powers the prime comparison. */
export interface MetricStat {
  key: string;
  label: string;
  unit: string;
  peak: number;
  peakDate: string;
  latest: number;
  latestDate: string;
  entryCount: number;
}

/** Consistency stats — current vs all-time-longest streak of active days. */
export interface StreakStats {
  current: number;
  longest: number;
  longestEndDate: string | null;
  activeDayCount: number;
}

/** Daily-output stats — peak single-day executedCount vs recent output average. */
export interface OutputStat {
  peak: number;
  peakDate: string | null;
  recentAvg: number;
  recentDays: number;
  mostRecentExecuted: number;
  mostRecentDate: string | null;
  outputDayCount: number;
}

/** Per-day checklist follow-through (check-kind only) for the discipline dimension. */
export interface AdherenceRow {
  date: string;
  done: number;
  total: number;
}
