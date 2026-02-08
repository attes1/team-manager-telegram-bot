import Database from 'better-sqlite3';
import { Kysely, type Migration, Migrator, SqliteDialect } from 'kysely';

const DB_PATH = process.env.DB_PATH ?? './data/bot.db';

export const runMigrations = async () => {
  const dialect = new SqliteDialect({
    database: new Database(DB_PATH),
  });

  const db = new Kysely({ dialect });

  const migrations: Record<string, Migration> = {
    '001_initial': await import('./migrations/001_initial'),
    '002_roster_roles': await import('./migrations/002_roster_roles'),
    '003_match_day_reminder_mode': await import('./migrations/003_match_day_reminder_mode'),
    '004_poll_cutoff': await import('./migrations/004_poll_cutoff'),
    '005_public_announcements': await import('./migrations/005_public_announcements'),
    '006_opponent_info': await import('./migrations/006_opponent_info'),
    '007_rename_cutoff_to_week_change': await import(
      './migrations/007_rename_cutoff_to_week_change'
    ),
    '008_active_menus': await import('./migrations/008_active_menus'),
    '009_menu_config': await import('./migrations/009_menu_config'),
    '010_groups': await import('./migrations/010_groups'),
    '011_public_commands_mode': await import('./migrations/011_public_commands_mode'),
    '012_player_dm_chats': await import('./migrations/012_player_dm_chats'),
  };

  const migrator = new Migrator({
    db,
    provider: {
      async getMigrations() {
        return migrations;
      },
    },
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

const isDirectRun = process.argv[1]?.includes('migrate');
if (isDirectRun) {
  runMigrations().catch(console.error);
}
