import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { up } from './migrations/001_initial';

const DB_PATH = process.env.DB_PATH ?? './data/bot.db';

const runMigrations = async () => {
  const dialect = new SqliteDialect({
    database: new Database(DB_PATH),
  });

  const db = new Kysely({ dialect });

  console.log('Running migrations...');
  await up(db);
  console.log('Migrations complete.');

  await db.destroy();
};

runMigrations().catch(console.error);
