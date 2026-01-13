import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { env } from '../env';
import { up } from './migrations/001_initial';

const runMigrations = async () => {
  const dialect = new SqliteDialect({
    database: new Database(env.DB_PATH),
  });

  const db = new Kysely({ dialect });

  console.log('Running migrations...');
  await up(db);
  console.log('Migrations complete.');

  await db.destroy();
};

runMigrations().catch(console.error);
