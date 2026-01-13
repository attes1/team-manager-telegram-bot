import { type Kysely, sql } from 'kysely';

export const up = async <T>(db: Kysely<T>) => {
  await sql`
    CREATE TABLE groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'public' CHECK(type IN ('public', 'team')),
      title TEXT,
      added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      removed_at TEXT
    )
  `.execute(db);

  // Index for finding team group quickly
  await sql`
    CREATE INDEX idx_groups_type ON groups(type) WHERE removed_at IS NULL
  `.execute(db);
};

export const down = async <T>(db: Kysely<T>) => {
  await sql`DROP INDEX IF EXISTS idx_groups_type`.execute(db);
  await sql`DROP TABLE IF EXISTS groups`.execute(db);
};
