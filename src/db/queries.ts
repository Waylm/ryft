import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  Checklist,
  ChecklistItem,
  ChecklistKind,
  Day,
  DaySummary,
  FocusArea,
  FocusBlock,
  FocusIntensity,
  Metric,
  MetricStat,
  Photo,
  Reminder,
  ReminderMessage,
  TemplateItem,
  TemplateItemType,
  TextSection,
} from './types';

const now = () => Date.now();

// ---------------------------------------------------------------------------
// Row shapes (snake_case as stored) + mappers to camelCase domain types
// ---------------------------------------------------------------------------

interface DayRow {
  id: number;
  date: string;
  title: string | null;
  note: string | null;
  is_prime: number;
  created_at: number;
  updated_at: number;
}

function mapDay(r: DayRow): Day {
  return {
    id: r.id,
    date: r.date,
    title: r.title,
    note: r.note,
    isPrime: !!r.is_prime,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Key/value settings
// ---------------------------------------------------------------------------

export async function getKv(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string | null }>(
    'SELECT value FROM kv WHERE key = ?',
    key
  );
  return row ? row.value : null;
}

export async function setKv(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value
  );
}

// ---------------------------------------------------------------------------
// Days
// ---------------------------------------------------------------------------

export async function getDayByDate(db: SQLiteDatabase, date: string): Promise<Day | null> {
  const row = await db.getFirstAsync<DayRow>('SELECT * FROM days WHERE date = ?', date);
  return row ? mapDay(row) : null;
}

export async function getDayById(db: SQLiteDatabase, id: number): Promise<Day | null> {
  const row = await db.getFirstAsync<DayRow>('SELECT * FROM days WHERE id = ?', id);
  return row ? mapDay(row) : null;
}

/**
 * Fetch the day for a date, creating it (seeded with the default template)
 * if none exists yet.
 */
export async function getOrCreateDay(db: SQLiteDatabase, date: string): Promise<Day> {
  const existing = await getDayByDate(db, date);
  if (existing) return existing;
  const t = now();
  const res = await db.runAsync(
    'INSERT INTO days (date, is_prime, created_at, updated_at) VALUES (?, 0, ?, ?)',
    date,
    t,
    t
  );
  const dayId = res.lastInsertRowId;
  await seedDefaultBlocks(db, dayId);
  const created = await getDayById(db, dayId);
  if (!created) throw new Error('Failed to create day');
  return created;
}

/**
 * Populate a freshly created day from the user's journal template. Positions
 * are assigned globally (across block types) so the day renders in template
 * order. Metrics/photos are visibility toggles, not seeded blocks.
 */
async function seedDefaultBlocks(db: SQLiteDatabase, dayId: number): Promise<void> {
  const items = await listTemplateItems(db);
  let pos = 0;
  for (const it of items) {
    if (!it.enabled) continue;
    if (it.type === 'checklist' || it.type === 'list') {
      await db.runAsync(
        'INSERT INTO checklists (day_id, label, kind, position) VALUES (?, ?, ?, ?)',
        dayId,
        it.label,
        it.type === 'list' ? 'list' : 'check',
        pos++
      );
    } else if (it.type === 'text') {
      await db.runAsync(
        'INSERT INTO text_sections (day_id, label, content, position) VALUES (?, ?, ?, ?)',
        dayId,
        it.label,
        '',
        pos++
      );
    } else if (it.type === 'focus') {
      await db.runAsync(
        'INSERT INTO focus_blocks (day_id, label, position) VALUES (?, ?, ?)',
        dayId,
        it.label,
        pos++
      );
    }
  }
}

/** Next global block position for a day, across checklists/text/focus. */
async function nextDayBlockPosition(db: SQLiteDatabase, dayId: number): Promise<number> {
  const row = await db.getFirstAsync<{ p: number | null }>(
    `SELECT MAX(p) AS p FROM (
       SELECT MAX(position) AS p FROM checklists     WHERE day_id = ?
       UNION ALL SELECT MAX(position) FROM text_sections WHERE day_id = ?
       UNION ALL SELECT MAX(position) FROM focus_blocks  WHERE day_id = ?
     )`,
    dayId,
    dayId,
    dayId
  );
  return (row?.p ?? -1) + 1;
}

export async function touchDay(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('UPDATE days SET updated_at = ? WHERE id = ?', now(), id);
}

export async function updateDayFields(
  db: SQLiteDatabase,
  id: number,
  fields: { title?: string | null; note?: string | null; isPrime?: boolean }
): Promise<void> {
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  if (fields.title !== undefined) {
    sets.push('title = ?');
    args.push(fields.title);
  }
  if (fields.note !== undefined) {
    sets.push('note = ?');
    args.push(fields.note);
  }
  if (fields.isPrime !== undefined) {
    sets.push('is_prime = ?');
    args.push(fields.isPrime ? 1 : 0);
  }
  if (sets.length === 0) return;
  sets.push('updated_at = ?');
  args.push(now());
  args.push(id);
  await db.runAsync(`UPDATE days SET ${sets.join(', ')} WHERE id = ?`, ...args);
}

export async function deleteDay(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM days WHERE id = ?', id);
}

export async function listDaySummaries(
  db: SQLiteDatabase,
  opts: { limit?: number; offset?: number } = {}
): Promise<DaySummary[]> {
  const limit = opts.limit ?? 60;
  const offset = opts.offset ?? 0;
  const rows = await db.getAllAsync<
    DayRow & {
      section_count: number;
      metric_count: number;
      photo_count: number;
      focus_count: number;
      checklist_total: number;
      checklist_done: number;
    }
  >(
    `SELECT d.*,
       (SELECT COUNT(*) FROM text_sections t WHERE t.day_id = d.id AND TRIM(t.content) <> '') AS section_count,
       (SELECT COUNT(*) FROM metrics m WHERE m.day_id = d.id) AS metric_count,
       (SELECT COUNT(*) FROM photos p WHERE p.day_id = d.id) AS photo_count,
       (SELECT COUNT(*) FROM focus_areas fa JOIN focus_blocks fb ON fb.id = fa.focus_block_id WHERE fb.day_id = d.id) AS focus_count,
       (SELECT COUNT(*) FROM checklist_items ci JOIN checklists c ON c.id = ci.checklist_id WHERE c.day_id = d.id) AS checklist_total,
       (SELECT COUNT(*) FROM checklist_items ci JOIN checklists c ON c.id = ci.checklist_id WHERE c.day_id = d.id AND ci.done = 1) AS checklist_done
     FROM days d
     ORDER BY d.date DESC
     LIMIT ? OFFSET ?`,
    limit,
    offset
  );
  return rows.map((r) => ({
    ...mapDay(r),
    sectionCount: r.section_count,
    metricCount: r.metric_count,
    photoCount: r.photo_count,
    focusCount: r.focus_count,
    checklistTotal: r.checklist_total,
    checklistDone: r.checklist_done,
    executedCount: r.checklist_done + r.section_count + r.metric_count + r.focus_count,
  }));
}

export async function listPrimeDays(db: SQLiteDatabase): Promise<Day[]> {
  const rows = await db.getAllAsync<DayRow>(
    'SELECT * FROM days WHERE is_prime = 1 ORDER BY date DESC'
  );
  return rows.map(mapDay);
}

export async function countDays(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM days');
  return row?.c ?? 0;
}

/**
 * Current consecutive-day grind streak. A day counts if it has any real
 * activity (done checklist item, metric, filled section, photo, or note).
 * The streak may end today or yesterday (so it survives an as-yet-empty today).
 */
export async function getStreak(db: SQLiteDatabase, todayIso: string): Promise<number> {
  const rows = await db.getAllAsync<{ date: string; activity: number }>(
    `SELECT d.date AS date,
       ( (SELECT COUNT(*) FROM checklist_items ci JOIN checklists c ON c.id = ci.checklist_id WHERE c.day_id = d.id AND ci.done = 1)
       + (SELECT COUNT(*) FROM metrics m WHERE m.day_id = d.id)
       + (SELECT COUNT(*) FROM text_sections t WHERE t.day_id = d.id AND TRIM(t.content) <> '')
       + (SELECT COUNT(*) FROM focus_areas fa JOIN focus_blocks fb ON fb.id = fa.focus_block_id WHERE fb.day_id = d.id)
       + (SELECT COUNT(*) FROM photos p WHERE p.day_id = d.id)
       + (CASE WHEN TRIM(COALESCE(d.note, '')) <> '' THEN 1 ELSE 0 END)
       ) AS activity
     FROM days d
     ORDER BY d.date DESC`
  );
  const active = new Set(rows.filter((r) => r.activity > 0).map((r) => r.date));
  if (active.size === 0) return 0;

  const oneDay = 86_400_000;
  const [y, m, dd] = todayIso.split('-').map(Number);
  let cursor = new Date(y, m - 1, dd);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;

  // Allow the streak to "start" at yesterday if today isn't logged yet.
  if (!active.has(iso(cursor))) {
    cursor = new Date(cursor.getTime() - oneDay);
    if (!active.has(iso(cursor))) return 0;
  }
  let streak = 0;
  while (active.has(iso(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - oneDay);
  }
  return streak;
}

// ---------------------------------------------------------------------------
// Text sections
// ---------------------------------------------------------------------------

export async function listTextSections(db: SQLiteDatabase, dayId: number): Promise<TextSection[]> {
  const rows = await db.getAllAsync<{
    id: number;
    day_id: number;
    label: string;
    content: string;
    position: number;
  }>('SELECT * FROM text_sections WHERE day_id = ? ORDER BY position, id', dayId);
  return rows.map((r) => ({
    id: r.id,
    dayId: r.day_id,
    label: r.label,
    content: r.content,
    position: r.position,
  }));
}

export async function addTextSection(
  db: SQLiteDatabase,
  dayId: number,
  label: string,
  content = ''
): Promise<number> {
  const pos = await nextDayBlockPosition(db, dayId);
  const res = await db.runAsync(
    'INSERT INTO text_sections (day_id, label, content, position) VALUES (?, ?, ?, ?)',
    dayId,
    label,
    content,
    pos
  );
  await touchDay(db, dayId);
  return res.lastInsertRowId;
}

export async function updateTextSection(
  db: SQLiteDatabase,
  id: number,
  fields: { label?: string; content?: string }
): Promise<void> {
  const sets: string[] = [];
  const args: (string | number)[] = [];
  if (fields.label !== undefined) {
    sets.push('label = ?');
    args.push(fields.label);
  }
  if (fields.content !== undefined) {
    sets.push('content = ?');
    args.push(fields.content);
  }
  if (sets.length === 0) return;
  args.push(id);
  await db.runAsync(`UPDATE text_sections SET ${sets.join(', ')} WHERE id = ?`, ...args);
}

export async function deleteTextSection(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM text_sections WHERE id = ?', id);
}

// ---------------------------------------------------------------------------
// Checklists
// ---------------------------------------------------------------------------

export async function listChecklists(db: SQLiteDatabase, dayId: number): Promise<Checklist[]> {
  const lists = await db.getAllAsync<{
    id: number;
    day_id: number;
    label: string;
    kind: string;
    position: number;
  }>('SELECT * FROM checklists WHERE day_id = ? ORDER BY position, id', dayId);
  if (lists.length === 0) return [];
  const ids = lists.map((l) => l.id);
  const placeholders = ids.map(() => '?').join(',');
  const items = await db.getAllAsync<{
    id: number;
    checklist_id: number;
    text: string;
    done: number;
    position: number;
  }>(
    `SELECT * FROM checklist_items WHERE checklist_id IN (${placeholders}) ORDER BY position, id`,
    ...ids
  );
  const byList = new Map<number, ChecklistItem[]>();
  for (const it of items) {
    const arr = byList.get(it.checklist_id) ?? [];
    arr.push({
      id: it.id,
      checklistId: it.checklist_id,
      text: it.text,
      done: !!it.done,
      position: it.position,
    });
    byList.set(it.checklist_id, arr);
  }
  return lists.map((l) => ({
    id: l.id,
    dayId: l.day_id,
    label: l.label,
    kind: l.kind === 'list' ? 'list' : 'check',
    position: l.position,
    items: byList.get(l.id) ?? [],
  }));
}

export async function addChecklist(
  db: SQLiteDatabase,
  dayId: number,
  label: string,
  kind: ChecklistKind = 'check'
): Promise<number> {
  const pos = await nextDayBlockPosition(db, dayId);
  const res = await db.runAsync(
    'INSERT INTO checklists (day_id, label, kind, position) VALUES (?, ?, ?, ?)',
    dayId,
    label,
    kind,
    pos
  );
  await touchDay(db, dayId);
  return res.lastInsertRowId;
}

export async function updateChecklist(
  db: SQLiteDatabase,
  id: number,
  label: string
): Promise<void> {
  await db.runAsync('UPDATE checklists SET label = ? WHERE id = ?', label, id);
}

export async function deleteChecklist(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM checklists WHERE id = ?', id);
}

export async function addChecklistItem(
  db: SQLiteDatabase,
  checklistId: number,
  text: string
): Promise<number> {
  const row = await db.getFirstAsync<{ p: number | null }>(
    'SELECT MAX(position) AS p FROM checklist_items WHERE checklist_id = ?',
    checklistId
  );
  const pos = (row?.p ?? -1) + 1;
  const res = await db.runAsync(
    'INSERT INTO checklist_items (checklist_id, text, done, position) VALUES (?, ?, 0, ?)',
    checklistId,
    text,
    pos
  );
  return res.lastInsertRowId;
}

export async function setChecklistItemDone(
  db: SQLiteDatabase,
  id: number,
  done: boolean
): Promise<void> {
  await db.runAsync('UPDATE checklist_items SET done = ? WHERE id = ?', done ? 1 : 0, id);
}

export async function updateChecklistItem(
  db: SQLiteDatabase,
  id: number,
  text: string
): Promise<void> {
  await db.runAsync('UPDATE checklist_items SET text = ? WHERE id = ?', text, id);
}

export async function deleteChecklistItem(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM checklist_items WHERE id = ?', id);
}

// ---------------------------------------------------------------------------
// Focus blocks
// ---------------------------------------------------------------------------

export async function listFocusBlocks(db: SQLiteDatabase, dayId: number): Promise<FocusBlock[]> {
  const blocks = await db.getAllAsync<{
    id: number;
    day_id: number;
    label: string;
    position: number;
  }>('SELECT * FROM focus_blocks WHERE day_id = ? ORDER BY position, id', dayId);
  if (blocks.length === 0) return [];
  const ids = blocks.map((b) => b.id);
  const placeholders = ids.map(() => '?').join(',');
  const areas = await db.getAllAsync<{
    id: number;
    focus_block_id: number;
    label: string;
    intensity: number;
    position: number;
  }>(
    `SELECT * FROM focus_areas WHERE focus_block_id IN (${placeholders}) ORDER BY position, id`,
    ...ids
  );
  const byBlock = new Map<number, FocusArea[]>();
  for (const a of areas) {
    const arr = byBlock.get(a.focus_block_id) ?? [];
    arr.push({
      id: a.id,
      focusBlockId: a.focus_block_id,
      label: a.label,
      intensity: clampIntensity(a.intensity),
      position: a.position,
    });
    byBlock.set(a.focus_block_id, arr);
  }
  return blocks.map((b) => ({
    id: b.id,
    dayId: b.day_id,
    label: b.label,
    position: b.position,
    areas: byBlock.get(b.id) ?? [],
  }));
}

export async function addFocusBlock(
  db: SQLiteDatabase,
  dayId: number,
  label: string
): Promise<number> {
  const pos = await nextDayBlockPosition(db, dayId);
  const res = await db.runAsync(
    'INSERT INTO focus_blocks (day_id, label, position) VALUES (?, ?, ?)',
    dayId,
    label,
    pos
  );
  await touchDay(db, dayId);
  return res.lastInsertRowId;
}

export async function updateFocusBlock(
  db: SQLiteDatabase,
  id: number,
  label: string
): Promise<void> {
  await db.runAsync('UPDATE focus_blocks SET label = ? WHERE id = ?', label, id);
}

export async function deleteFocusBlock(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM focus_blocks WHERE id = ?', id);
}

export async function addFocusArea(
  db: SQLiteDatabase,
  focusBlockId: number,
  label: string,
  intensity: FocusIntensity = 2
): Promise<number> {
  const row = await db.getFirstAsync<{ p: number | null }>(
    'SELECT MAX(position) AS p FROM focus_areas WHERE focus_block_id = ?',
    focusBlockId
  );
  const pos = (row?.p ?? -1) + 1;
  const res = await db.runAsync(
    'INSERT INTO focus_areas (focus_block_id, label, intensity, position) VALUES (?, ?, ?, ?)',
    focusBlockId,
    label,
    intensity,
    pos
  );
  return res.lastInsertRowId;
}

export async function setFocusIntensity(
  db: SQLiteDatabase,
  id: number,
  intensity: FocusIntensity
): Promise<void> {
  await db.runAsync('UPDATE focus_areas SET intensity = ? WHERE id = ?', intensity, id);
}

export async function updateFocusArea(
  db: SQLiteDatabase,
  id: number,
  label: string
): Promise<void> {
  await db.runAsync('UPDATE focus_areas SET label = ? WHERE id = ?', label, id);
}

export async function deleteFocusArea(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM focus_areas WHERE id = ?', id);
}

function clampIntensity(n: number): FocusIntensity {
  if (n <= 1) return 1;
  if (n >= 3) return 3;
  return 2;
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export async function listMetrics(db: SQLiteDatabase, dayId: number): Promise<Metric[]> {
  const rows = await db.getAllAsync<{
    id: number;
    day_id: number;
    key: string;
    label: string;
    value: number;
    unit: string;
    position: number;
  }>('SELECT * FROM metrics WHERE day_id = ? ORDER BY position, id', dayId);
  return rows.map((r) => ({
    id: r.id,
    dayId: r.day_id,
    key: r.key,
    label: r.label,
    value: r.value,
    unit: r.unit,
    position: r.position,
  }));
}

export async function addMetric(
  db: SQLiteDatabase,
  dayId: number,
  data: { key: string; label: string; value: number; unit: string }
): Promise<number> {
  const pos = await nextPosition(db, 'metrics', dayId);
  const res = await db.runAsync(
    'INSERT INTO metrics (day_id, key, label, value, unit, position) VALUES (?, ?, ?, ?, ?, ?)',
    dayId,
    data.key,
    data.label,
    data.value,
    data.unit,
    pos
  );
  await touchDay(db, dayId);
  return res.lastInsertRowId;
}

export async function updateMetric(
  db: SQLiteDatabase,
  id: number,
  data: { label?: string; value?: number; unit?: string }
): Promise<void> {
  const sets: string[] = [];
  const args: (string | number)[] = [];
  if (data.label !== undefined) {
    sets.push('label = ?');
    args.push(data.label);
  }
  if (data.value !== undefined) {
    sets.push('value = ?');
    args.push(data.value);
  }
  if (data.unit !== undefined) {
    sets.push('unit = ?');
    args.push(data.unit);
  }
  if (sets.length === 0) return;
  args.push(id);
  await db.runAsync(`UPDATE metrics SET ${sets.join(', ')} WHERE id = ?`, ...args);
}

export async function deleteMetric(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM metrics WHERE id = ?', id);
}

/** Distinct metric keys seen before, for quick-add suggestions. */
export async function listMetricKeys(
  db: SQLiteDatabase
): Promise<{ key: string; label: string; unit: string }[]> {
  const rows = await db.getAllAsync<{ key: string; label: string; unit: string }>(
    `SELECT key, label, unit FROM metrics m
     WHERE id = (SELECT MAX(id) FROM metrics m2 WHERE m2.key = m.key)
     ORDER BY label`
  );
  return rows;
}

/** Peak + latest per metric key across all time — the raw material for prime comparison. */
export async function getMetricStats(db: SQLiteDatabase): Promise<MetricStat[]> {
  const rows = await db.getAllAsync<{
    key: string;
    label: string;
    unit: string;
    value: number;
    date: string;
  }>(
    `SELECT m.key, m.label, m.unit, m.value, d.date
     FROM metrics m JOIN days d ON d.id = m.day_id
     ORDER BY d.date ASC`
  );

  const byKey = new Map<string, MetricStat>();
  for (const r of rows) {
    const existing = byKey.get(r.key);
    if (!existing) {
      byKey.set(r.key, {
        key: r.key,
        label: r.label,
        unit: r.unit,
        peak: r.value,
        peakDate: r.date,
        latest: r.value,
        latestDate: r.date,
        entryCount: 1,
      });
      continue;
    }
    existing.entryCount++;
    if (r.value > existing.peak) {
      existing.peak = r.value;
      existing.peakDate = r.date;
    }
    // rows are date-ascending, so the last one wins as "latest"
    existing.latest = r.value;
    existing.latestDate = r.date;
    existing.label = r.label;
    existing.unit = r.unit;
  }
  return Array.from(byKey.values()).sort((a, b) => a.label.localeCompare(b.label));
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

export async function listPhotos(db: SQLiteDatabase, dayId: number): Promise<Photo[]> {
  const rows = await db.getAllAsync<{
    id: number;
    day_id: number;
    uri: string;
    caption: string | null;
    position: number;
    created_at: number;
  }>('SELECT * FROM photos WHERE day_id = ? ORDER BY position, id', dayId);
  return rows.map((r) => ({
    id: r.id,
    dayId: r.day_id,
    uri: r.uri,
    caption: r.caption,
    position: r.position,
    createdAt: r.created_at,
  }));
}

export async function addPhoto(
  db: SQLiteDatabase,
  dayId: number,
  uri: string,
  caption: string | null = null
): Promise<number> {
  const pos = await nextPosition(db, 'photos', dayId);
  const res = await db.runAsync(
    'INSERT INTO photos (day_id, uri, caption, position, created_at) VALUES (?, ?, ?, ?, ?)',
    dayId,
    uri,
    caption,
    pos,
    now()
  );
  await touchDay(db, dayId);
  return res.lastInsertRowId;
}

export async function updatePhotoCaption(
  db: SQLiteDatabase,
  id: number,
  caption: string | null
): Promise<void> {
  await db.runAsync('UPDATE photos SET caption = ? WHERE id = ?', caption, id);
}

export async function deletePhoto(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM photos WHERE id = ?', id);
}

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

function mapReminder(r: {
  id: number;
  message: string;
  hour: number;
  minute: number;
  days_of_week: string;
  enabled: number;
  created_at: number;
}): Reminder {
  return {
    id: r.id,
    message: r.message,
    hour: r.hour,
    minute: r.minute,
    daysOfWeek: r.days_of_week
      .split(',')
      .filter((s) => s.length > 0)
      .map(Number),
    enabled: !!r.enabled,
    createdAt: r.created_at,
  };
}

export async function listReminders(db: SQLiteDatabase): Promise<Reminder[]> {
  const rows = await db.getAllAsync<Parameters<typeof mapReminder>[0]>(
    'SELECT * FROM reminders ORDER BY hour, minute, id'
  );
  return rows.map(mapReminder);
}

export async function getReminder(db: SQLiteDatabase, id: number): Promise<Reminder | null> {
  const row = await db.getFirstAsync<Parameters<typeof mapReminder>[0]>(
    'SELECT * FROM reminders WHERE id = ?',
    id
  );
  return row ? mapReminder(row) : null;
}

export async function addReminder(
  db: SQLiteDatabase,
  data: {
    message: string;
    hour: number;
    minute: number;
    daysOfWeek: number[];
    enabled?: boolean;
  }
): Promise<number> {
  const res = await db.runAsync(
    'INSERT INTO reminders (message, hour, minute, days_of_week, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    data.message,
    data.hour,
    data.minute,
    data.daysOfWeek.join(','),
    data.enabled === false ? 0 : 1,
    now()
  );
  return res.lastInsertRowId;
}

export async function updateReminder(
  db: SQLiteDatabase,
  id: number,
  data: {
    message?: string;
    hour?: number;
    minute?: number;
    daysOfWeek?: number[];
    enabled?: boolean;
  }
): Promise<void> {
  const sets: string[] = [];
  const args: (string | number)[] = [];
  if (data.message !== undefined) {
    sets.push('message = ?');
    args.push(data.message);
  }
  if (data.hour !== undefined) {
    sets.push('hour = ?');
    args.push(data.hour);
  }
  if (data.minute !== undefined) {
    sets.push('minute = ?');
    args.push(data.minute);
  }
  if (data.daysOfWeek !== undefined) {
    sets.push('days_of_week = ?');
    args.push(data.daysOfWeek.join(','));
  }
  if (data.enabled !== undefined) {
    sets.push('enabled = ?');
    args.push(data.enabled ? 1 : 0);
  }
  if (sets.length === 0) return;
  args.push(id);
  await db.runAsync(`UPDATE reminders SET ${sets.join(', ')} WHERE id = ?`, ...args);
}

export async function deleteReminder(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM reminders WHERE id = ?', id);
}

export async function getReminderNotificationIds(
  db: SQLiteDatabase,
  reminderId: number
): Promise<string[]> {
  const rows = await db.getAllAsync<{ notification_id: string }>(
    'SELECT notification_id FROM reminder_notifications WHERE reminder_id = ?',
    reminderId
  );
  return rows.map((r) => r.notification_id);
}

export async function setReminderNotifications(
  db: SQLiteDatabase,
  reminderId: number,
  entries: { weekday: number; notificationId: string }[]
): Promise<void> {
  await db.runAsync('DELETE FROM reminder_notifications WHERE reminder_id = ?', reminderId);
  for (const e of entries) {
    await db.runAsync(
      'INSERT INTO reminder_notifications (reminder_id, weekday, notification_id) VALUES (?, ?, ?)',
      reminderId,
      e.weekday,
      e.notificationId
    );
  }
}

export async function clearReminderNotifications(
  db: SQLiteDatabase,
  reminderId: number
): Promise<void> {
  await db.runAsync('DELETE FROM reminder_notifications WHERE reminder_id = ?', reminderId);
}

// ---------------------------------------------------------------------------
// Reminder message library
// ---------------------------------------------------------------------------

export async function listReminderMessages(db: SQLiteDatabase): Promise<ReminderMessage[]> {
  const rows = await db.getAllAsync<{ id: number; text: string; is_custom: number }>(
    'SELECT * FROM reminder_messages ORDER BY is_custom, id'
  );
  return rows.map((r) => ({ id: r.id, text: r.text, isCustom: !!r.is_custom }));
}

export async function addReminderMessage(db: SQLiteDatabase, text: string): Promise<number> {
  const res = await db.runAsync(
    'INSERT INTO reminder_messages (text, is_custom) VALUES (?, 1)',
    text
  );
  return res.lastInsertRowId;
}

export async function deleteReminderMessage(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM reminder_messages WHERE id = ? AND is_custom = 1', id);
}

// ---------------------------------------------------------------------------
// Journal template
// ---------------------------------------------------------------------------

export async function listTemplateItems(db: SQLiteDatabase): Promise<TemplateItem[]> {
  const rows = await db.getAllAsync<{
    id: number;
    type: string;
    label: string;
    enabled: number;
    position: number;
  }>('SELECT * FROM template_items ORDER BY position, id');
  return rows.map((r) => ({
    id: r.id,
    type: r.type as TemplateItemType,
    label: r.label,
    enabled: !!r.enabled,
    position: r.position,
  }));
}

export async function addTemplateItem(
  db: SQLiteDatabase,
  type: TemplateItemType,
  label: string
): Promise<number> {
  const row = await db.getFirstAsync<{ p: number | null }>(
    'SELECT MAX(position) AS p FROM template_items'
  );
  const pos = (row?.p ?? -1) + 1;
  const res = await db.runAsync(
    'INSERT INTO template_items (type, label, enabled, position) VALUES (?, ?, 1, ?)',
    type,
    label,
    pos
  );
  return res.lastInsertRowId;
}

export async function updateTemplateItem(
  db: SQLiteDatabase,
  id: number,
  fields: { label?: string; enabled?: boolean }
): Promise<void> {
  const sets: string[] = [];
  const args: (string | number)[] = [];
  if (fields.label !== undefined) {
    sets.push('label = ?');
    args.push(fields.label);
  }
  if (fields.enabled !== undefined) {
    sets.push('enabled = ?');
    args.push(fields.enabled ? 1 : 0);
  }
  if (sets.length === 0) return;
  args.push(id);
  await db.runAsync(`UPDATE template_items SET ${sets.join(', ')} WHERE id = ?`, ...args);
}

export async function deleteTemplateItem(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM template_items WHERE id = ?', id);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function nextPosition(
  db: SQLiteDatabase,
  table: 'text_sections' | 'checklists' | 'metrics' | 'photos' | 'focus_blocks',
  dayId: number
): Promise<number> {
  const row = await db.getFirstAsync<{ p: number | null }>(
    `SELECT MAX(position) AS p FROM ${table} WHERE day_id = ?`,
    dayId
  );
  return (row?.p ?? -1) + 1;
}
