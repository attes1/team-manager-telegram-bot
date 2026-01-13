import { type Kysely, sql } from 'kysely';

export const up = async <T>(db: Kysely<T>) => {
  await sql`
    CREATE TABLE active_menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
      chat_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      menu_type TEXT NOT NULL CHECK(menu_type IN ('poll', 'lineup')),
      message_id INTEGER NOT NULL,
      week_number INTEGER NOT NULL,
      year INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(chat_id, user_id, menu_type)
    )
  `.execute(db);

  // Index for cleanup queries
  await sql`
    CREATE INDEX idx_active_menus_season_created
    ON active_menus(season_id, created_at)
  `.execute(db);
};

export const down = async <T>(db: Kysely<T>) => {
  await sql`DROP INDEX IF EXISTS idx_active_menus_season_created`.execute(db);
  await sql`DROP TABLE IF EXISTS active_menus`.execute(db);
};
