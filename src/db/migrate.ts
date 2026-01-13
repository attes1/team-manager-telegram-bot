import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { up as up001 } from './migrations/001_initial';
import { up as up002 } from './migrations/002_roster_roles';
import { up as up003 } from './migrations/003_match_day_reminder_mode';
import { up as up004 } from './migrations/004_poll_cutoff';

const DB_PATH = process.env.DB_PATH ?? './data/bot.db';

const runMigrations = async () => {
  const dialect = new SqliteDialect({
    database: new Database(DB_PATH),
  });

  const db = new Kysely({ dialect });

  console.log('Running migrations...');
  await up001(db);
  await up002(db);
  await up003(db);
  await up004(db);
  console.log('Migrations complete.');

  await db.destroy();
};

runMigrations().catch(console.error);
