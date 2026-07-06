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

export interface Checklist {
  id: number;
  dayId: number;
  label: string;
  position: number;
  items: ChecklistItem[];
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
