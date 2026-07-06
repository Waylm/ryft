import type { Checklist, DaySummary, FocusBlock, Metric, Photo, TextSection } from '@/db/types';

export type SegStatus = 'done' | 'partial' | 'skip';

export interface Segment {
  status: SegStatus;
  label: string;
}

/** Overall one-word status for a day, used for the timeline pill + card tint. */
export function dayOverallStatus(d: DaySummary): SegStatus {
  const hasNote = !!(d.note && d.note.trim().length > 0);
  const activity = d.executedCount + d.photoCount + (hasNote ? 1 : 0);
  if (activity === 0) return 'skip';
  // Partial when there's an unfinished checklist and little else logged.
  if (d.checklistTotal > 0 && d.checklistDone < d.checklistTotal && d.metricCount === 0) {
    return 'partial';
  }
  return 'done';
}

export function checklistStatus(c: Checklist): SegStatus {
  if (c.items.length === 0) return 'skip';
  const done = c.items.filter((i) => i.done).length;
  if (done === 0) return 'skip';
  if (done < c.items.length) return 'partial';
  return 'done';
}

/**
 * Build the vertical spine segments for a day-detail view from its real blocks,
 * mirroring journal-d1.html's [Skincare, Ideas, Executed, Workout] spine.
 */
export function focusStatus(f: FocusBlock): SegStatus {
  if (f.areas.length === 0) return 'skip';
  return 'done';
}

export function buildDaySpine(input: {
  checklists: Checklist[];
  sections: TextSection[];
  focusBlocks: FocusBlock[];
  metrics: Metric[];
  photos: Photo[];
}): Segment[] {
  const segments: Segment[] = [];
  for (const c of input.checklists) {
    segments.push({ status: checklistStatus(c), label: c.label });
  }
  for (const s of input.sections) {
    segments.push({
      status: s.content.trim().length > 0 ? 'done' : 'skip',
      label: s.label,
    });
  }
  for (const f of input.focusBlocks) {
    segments.push({ status: focusStatus(f), label: f.label });
  }
  if (input.metrics.length > 0) {
    segments.push({ status: 'done', label: 'Metrics' });
  }
  if (input.photos.length > 0) {
    segments.push({ status: 'done', label: 'Photos' });
  }
  return segments;
}

/** Rough spine segments for a timeline card, derived from summary rollups only. */
export function summarySegments(d: DaySummary): Segment[] {
  const segs: Segment[] = [];
  if (d.checklistTotal > 0) {
    segs.push({
      status:
        d.checklistDone === 0 ? 'skip' : d.checklistDone < d.checklistTotal ? 'partial' : 'done',
      label: 'checklist',
    });
  }
  segs.push({ status: d.sectionCount > 0 ? 'done' : 'skip', label: 'notes' });
  if (d.focusCount > 0) segs.push({ status: 'done', label: 'focus' });
  segs.push({ status: d.metricCount > 0 ? 'done' : 'skip', label: 'metrics' });
  if (d.photoCount > 0) segs.push({ status: 'done', label: 'photos' });
  return segs;
}

/** "3 done · 2 metrics · 1 photo" style one-liner for a timeline card. */
export function summaryLine(d: DaySummary): string {
  const parts: string[] = [];
  if (d.checklistTotal > 0) parts.push(`${d.checklistDone}/${d.checklistTotal} done`);
  if (d.sectionCount > 0) parts.push(`${d.sectionCount} note${d.sectionCount > 1 ? 's' : ''}`);
  if (d.focusCount > 0) parts.push(`${d.focusCount} focus`);
  if (d.metricCount > 0) parts.push(`${d.metricCount} metric${d.metricCount > 1 ? 's' : ''}`);
  if (d.photoCount > 0) parts.push(`${d.photoCount} photo${d.photoCount > 1 ? 's' : ''}`);
  if (parts.length === 0) return 'rest day — nothing logged';
  return parts.join('  ·  ');
}

export function statusColor(
  status: SegStatus,
  colors: { statusDone: string; statusPartial: string; statusSkip: string }
): string {
  switch (status) {
    case 'done':
      return colors.statusDone;
    case 'partial':
      return colors.statusPartial;
    case 'skip':
      return colors.statusSkip;
  }
}
