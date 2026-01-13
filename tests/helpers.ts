import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { CamelCasePlugin, FileMigrationProvider, Kysely, Migrator, SqliteDialect } from 'kysely';
import type { DB } from '@/types/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
