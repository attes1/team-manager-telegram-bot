import Database from 'better-sqlite3';
import { CamelCasePlugin, Kysely, SqliteDialect } from 'kysely';
import { up } from '@/db/migrations/001_initial';
import type { DB } from '@/types/db';

export const testEnv = {
  DEFAULT_LANGUAGE: 'en' as const,
  DEFAULT_POLL_DAY: 'sun',
  DEFAULT_POLL_TIME: '10:00',
  DEFAULT_POLL_DAYS: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  DEFAULT_POLL_TIMES: [19, 20, 21],
  DEFAULT_REMINDER_DAY: 'wed',
  DEFAULT_REMINDER_TIME: '18:00',
  DEFAULT_REMINDERS_MODE: 'quiet' as const,
  DEFAULT_MATCH_DAY: 'sun',
  DEFAULT_MATCH_TIME: '20:00',
  DEFAULT_LINEUP_SIZE: 5,
};

export const createTestDb = async (): Promise<Kysely<DB>> => {
  const db = new Kysely<DB>({
    dialect: new SqliteDialect({
      database: new Database(':memory:'),
    }),
    plugins: [new CamelCasePlugin()],
  });
  await up(db);
  return db;
};
