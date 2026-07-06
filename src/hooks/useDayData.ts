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
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const d = await getOrCreateDay(db, date);
    const [c, s, f, m, p] = await Promise.all([
      listChecklists(db, d.id),
      listTextSections(db, d.id),
      listFocusBlocks(db, d.id),
      listMetrics(db, d.id),
      listPhotos(db, d.id),
    ]);
    setDay(d);
    setChecklists(c);
    setSections(s);
    setFocusBlocks(f);
    setMetrics(m);
    setPhotos(p);
    setLoading(false);
  }, [db, date]);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  return { db, day, checklists, sections, focusBlocks, metrics, photos, loading, reload, setDay };
}
