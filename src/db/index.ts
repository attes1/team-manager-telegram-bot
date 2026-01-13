import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { env } from '../env';
import type { DB } from '../types/db';

const dialect = new SqliteDialect({
  database: new Database(env.DB_PATH),
});

export const db = new Kysely<DB>({ dialect });
