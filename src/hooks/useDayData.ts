import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  getOrCreateDay,
  listChecklists,
  listTextSections,
  listFocusBlocks,
  listMetrics,
  listPhotos,
  listTemplateItems,
} from '@/db/queries';
import type { Checklist, Day, FocusBlock, Metric, Photo, TextSection } from '@/db/types';

export interface DayData {
  db: SQLiteDatabase;
  day: Day | null;
  checklists: Checklist[];
  sections: TextSection[];
  focusBlocks: FocusBlock[];
  metrics: Metric[];
  photos: Photo[];
  /** Whether to show the Metrics / Photos sections (template toggle, or data exists). */
  showMetrics: boolean;
  showPhotos: boolean;
  loading: boolean;
  reload: () => Promise<void>;
  setDay: (day: Day) => void;
}

/** Loads (or creates) a day and all its blocks, with a reload for after mutations. */
export function useDayData(date: string): DayData {
  const db = useSQLiteContext();
  const [day, setDay] = useState<Day | null>(null);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [sections, setSections] = useState<TextSection[]>([]);
  const [focusBlocks, setFocusBlocks] = useState<FocusBlock[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [showMetrics, setShowMetrics] = useState(true);
  const [showPhotos, setShowPhotos] = useState(true);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const d = await getOrCreateDay(db, date);
    const [c, s, f, m, p, template] = await Promise.all([
      listChecklists(db, d.id),
      listTextSections(db, d.id),
      listFocusBlocks(db, d.id),
      listMetrics(db, d.id),
      listPhotos(db, d.id),
      listTemplateItems(db),
    ]);
    const metricsEnabled = template.some((t) => t.type === 'metrics' && t.enabled);
    const photosEnabled = template.some((t) => t.type === 'photos' && t.enabled);
    setDay(d);
    setChecklists(c);
    setSections(s);
    setFocusBlocks(f);
    setMetrics(m);
    setPhotos(p);
    // Always show a section that already has data, so toggling off never hides logged work.
    setShowMetrics(metricsEnabled || m.length > 0);
    setShowPhotos(photosEnabled || p.length > 0);
    setLoading(false);
  }, [db, date]);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  return {
    db,
    day,
    checklists,
    sections,
    focusBlocks,
    metrics,
    photos,
    showMetrics,
    showPhotos,
    loading,
    reload,
    setDay,
  };
}
