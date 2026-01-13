import { type Kysely, sql } from 'kysely';

export const up = async <T>(db: Kysely<T>) => {
  await sql`
    CREATE TABLE player_dm_chats (
      player_id INTEGER PRIMARY KEY REFERENCES players(telegram_id) ON DELETE CASCADE,
      dm_chat_id INTEGER NOT NULL,
      can_dm INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `.execute(db);
};

export const down = async <T>(db: Kysely<T>) => {
  await sql`DROP TABLE IF EXISTS player_dm_chats`.execute(db);
};
