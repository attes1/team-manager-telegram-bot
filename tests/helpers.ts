import { up } from '@/db/migrations/001_initial';
import type { DB } from '@/types/db';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';

export const createTestDb = async (): Promise<Kysely<DB>> => {
  const db = new Kysely<DB>({
    dialect: new SqliteDialect({
      database: new Database(':memory:'),
    }),
  });
  await up(db);
  return db;
};
