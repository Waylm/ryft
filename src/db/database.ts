import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'ryft.db';

/**
 * Ordered list of forward migrations. The array index + 1 is the schema
 * version; `PRAGMA user_version` tracks how many have been applied. Never edit
 * a shipped migration — append a new one.
 */
const MIGRATIONS: string[] = [
  // v1 — initial local journal schema
  `
  CREATE TABLE kv (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT
  );

  CREATE TABLE days (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    date       TEXT NOT NULL UNIQUE,
    title      TEXT,
    note       TEXT,
    is_prime   INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE text_sections (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    day_id   INTEGER NOT NULL REFERENCES days(id) ON DELETE CASCADE,
    label    TEXT NOT NULL,
    content  TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE checklists (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    day_id   INTEGER NOT NULL REFERENCES days(id) ON DELETE CASCADE,
    label    TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE checklist_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    checklist_id INTEGER NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    text         TEXT NOT NULL,
    done         INTEGER NOT NULL DEFAULT 0,
    position     INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE metrics (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    day_id   INTEGER NOT NULL REFERENCES days(id) ON DELETE CASCADE,
    key      TEXT NOT NULL,
    label    TEXT NOT NULL,
    value    REAL NOT NULL,
    unit     TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX idx_metrics_key ON metrics(key);
  CREATE INDEX idx_metrics_day ON metrics(day_id);

  CREATE TABLE photos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    day_id     INTEGER NOT NULL REFERENCES days(id) ON DELETE CASCADE,
    uri        TEXT NOT NULL,
    caption    TEXT,
    position   INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE reminders (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    message      TEXT NOT NULL,
    hour         INTEGER NOT NULL,
    minute       INTEGER NOT NULL,
    days_of_week TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6',
    enabled      INTEGER NOT NULL DEFAULT 1,
    created_at   INTEGER NOT NULL
  );

  CREATE TABLE reminder_notifications (
    reminder_id     INTEGER NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
    weekday         INTEGER NOT NULL,
    notification_id TEXT NOT NULL,
    PRIMARY KEY (reminder_id, weekday)
  );

  CREATE TABLE reminder_messages (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    text      TEXT NOT NULL,
    is_custom INTEGER NOT NULL DEFAULT 0
  );
  `,
];

/** The "prime hood" starter pack — hard-hitting lines that ship with the app. */
export const DEFAULT_REMINDER_MESSAGES = [
  'You said you would change.',
  'There is no tomorrow. Do it today.',
  'Yesterday you was weaker. Prove it.',
  'Your prime is watching. Do not embarrass him.',
  'Comfort is the enemy. Move.',
  'Nobody is coming. Get up.',
  'You are one session away from momentum.',
  'The gap to your prime closes today or never.',
  'Discipline is remembering what you want.',
  'You did not come this far to only come this far.',
  'Be better than the you from yesterday.',
  'Excuses do not lift the weight.',
];

async function seedReminderMessages(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM reminder_messages'
  );
  if (row && row.c > 0) return;
  for (const text of DEFAULT_REMINDER_MESSAGES) {
    await db.runAsync(
      'INSERT INTO reminder_messages (text, is_custom) VALUES (?, 0)',
      text
    );
  }
}

/**
 * Called by <SQLiteProvider onInit>. Enables FK enforcement + WAL, then applies
 * any pending migrations inside a transaction and seeds default content.
 */
export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  let version = result?.user_version ?? 0;

  if (version >= MIGRATIONS.length) {
    await seedReminderMessages(db);
    return;
  }

  for (let i = version; i < MIGRATIONS.length; i++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[i]);
    });
    version = i + 1;
    // PRAGMA can't be parameterized; version is a trusted loop integer.
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }

  await seedReminderMessages(db);
}
