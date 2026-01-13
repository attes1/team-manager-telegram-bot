import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { FileMigrationProvider, Kysely, Migrator, SqliteDialect } from 'kysely';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH ?? './data/bot.db';

const runMigrations = async () => {
  const dialect = new SqliteDialect({
    database: new Database(DB_PATH),
  });

  const db = new Kysely({ dialect });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, 'migrations'),
    }),
  });

  console.log('Running migrations...');

  const { error, results } = await migrator.migrateToLatest();

  for (const result of results ?? []) {
    if (result.status === 'Success') {
      console.log(`  ✓ ${result.migrationName}`);
    } else if (result.status === 'Error') {
      console.error(`  ✗ ${result.migrationName}`);
    }
  }

  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  if (!results?.length) {
    console.log('No pending migrations.');
  } else {
    console.log('Migrations complete.');
  }

  await db.destroy();
};

runMigrations().catch(console.error);
