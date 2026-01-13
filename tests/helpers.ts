import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { CamelCasePlugin, FileMigrationProvider, Kysely, Migrator, SqliteDialect } from 'kysely';
import type { DB } from '@/types/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const testEnv = {
  DEFAULT_LANGUAGE: 'en' as const,
  DEFAULT_POLL_DAY: 'sun',
  DEFAULT_POLL_TIME: '10:00',
  DEFAULT_POLL_DAYS: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  DEFAULT_POLL_TIMES: [19, 20, 21],
  DEFAULT_POLL_REMINDER_DAY: 'wed',
  DEFAULT_POLL_REMINDER_TIME: '18:00',
  DEFAULT_POLL_REMINDER_MODE: 'quiet' as const,
  DEFAULT_MATCH_DAY: 'sun',
  DEFAULT_MATCH_TIME: '20:00',
  DEFAULT_LINEUP_SIZE: 5,
  DEFAULT_MATCH_DAY_REMINDER_MODE: 'quiet' as const,
  DEFAULT_MATCH_DAY_REMINDER_TIME: '18:00',
};

export const createTestDb = async (): Promise<Kysely<DB>> => {
  const db = new Kysely<DB>({
    dialect: new SqliteDialect({
      database: new Database(':memory:'),
    }),
    plugins: [new CamelCasePlugin()],
  });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, '../src/db/migrations'),
    }),
  });

  const { error } = await migrator.migrateToLatest();

  if (error) {
    throw error;
  }

  return db;
};
