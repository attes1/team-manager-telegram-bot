import { type Kysely, sql } from 'kysely';

export async function up<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable('seasons')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('status', 'text', (col) =>
      col.notNull().defaultTo('active').check(sql`status IN ('active', 'ended')`),
    )
    .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
    .addColumn('ended_at', 'text')
    .execute();

  await db.schema
    .createTable('config')
    .addColumn('season_id', 'integer', (col) =>
      col.primaryKey().references('seasons.id').onDelete('cascade'),
    )
    .addColumn('language', 'text', (col) => col.notNull().defaultTo('fi'))
    .addColumn('poll_day', 'text', (col) => col.notNull().defaultTo('sun'))
    .addColumn('poll_time', 'text', (col) =>
      col.notNull().defaultTo('10:00').check(sql`poll_time GLOB '[0-2][0-9]:[0-5][0-9]'`),
    )
    .addColumn('poll_days', 'text', (col) => col.notNull().defaultTo('mon,tue,wed,thu,fri,sat,sun'))
    .addColumn('poll_times', 'text', (col) => col.notNull().defaultTo('19,20,21'))
    .addColumn('reminder_day', 'text', (col) => col.notNull().defaultTo('wed'))
    .addColumn('reminder_time', 'text', (col) =>
      col.notNull().defaultTo('18:00').check(sql`reminder_time GLOB '[0-2][0-9]:[0-5][0-9]'`),
    )
    .addColumn('reminders_mode', 'text', (col) =>
      col.notNull().defaultTo('quiet').check(sql`reminders_mode IN ('ping', 'quiet', 'off')`),
    )
    .addColumn('match_day', 'text', (col) => col.notNull().defaultTo('sun'))
    .addColumn('match_time', 'text', (col) =>
      col.notNull().defaultTo('20:00').check(sql`match_time GLOB '[0-2][0-9]:[0-5][0-9]'`),
    )
    .addColumn('lineup_size', 'integer', (col) => col.notNull().defaultTo(5))
    .execute();

  await db.schema
    .createTable('players')
    .addColumn('telegram_id', 'integer', (col) => col.primaryKey())
    .addColumn('username', 'text')
    .addColumn('display_name', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
    .execute();

  await db.schema
    .createTable('season_roster')
    .addColumn('season_id', 'integer', (col) =>
      col.notNull().references('seasons.id').onDelete('cascade'),
    )
    .addColumn('player_id', 'integer', (col) =>
      col.notNull().references('players.telegram_id').onDelete('cascade'),
    )
    .addColumn('added_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
    .addPrimaryKeyConstraint('pk_roster', ['season_id', 'player_id'])
    .execute();

  await db.schema
    .createTable('day_responses')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('season_id', 'integer', (col) =>
      col.notNull().references('seasons.id').onDelete('cascade'),
    )
    .addColumn('player_id', 'integer', (col) =>
      col.notNull().references('players.telegram_id').onDelete('cascade'),
    )
    .addColumn('week_number', 'integer', (col) => col.notNull())
    .addColumn('year', 'integer', (col) => col.notNull())
    .addColumn('day', 'text', (col) =>
      col.notNull().check(sql`day IN ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')`),
    )
    .addColumn('status', 'text', (col) =>
      col
        .notNull()
        .check(
          sql`status IN ('available', 'practice_only', 'match_only', 'if_needed', 'unavailable')`,
        ),
    )
    .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
    .addUniqueConstraint('uq_day_response', [
      'season_id',
      'player_id',
      'week_number',
      'year',
      'day',
    ])
    .execute();

  await db.schema
    .createTable('time_slots')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('day_response_id', 'integer', (col) =>
      col.notNull().references('day_responses.id').onDelete('cascade'),
    )
    .addColumn('time_slot', 'text', (col) => col.notNull())
    .addUniqueConstraint('uq_time_slot', ['day_response_id', 'time_slot'])
    .execute();

  await db.schema
    .createTable('weeks')
    .addColumn('season_id', 'integer', (col) =>
      col.notNull().references('seasons.id').onDelete('cascade'),
    )
    .addColumn('week_number', 'integer', (col) => col.notNull())
    .addColumn('year', 'integer', (col) => col.notNull())
    .addColumn('type', 'text', (col) =>
      col.notNull().defaultTo('match').check(sql`type IN ('match', 'practice')`),
    )
    .addColumn('match_day', 'text', (col) =>
      col.check(
        sql`match_day IS NULL OR match_day IN ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')`,
      ),
    )
    .addColumn('match_time', 'text', (col) =>
      col.check(sql`match_time IS NULL OR match_time GLOB '[0-2][0-9]:[0-5][0-9]'`),
    )
    .addPrimaryKeyConstraint('pk_weeks', ['season_id', 'week_number', 'year'])
    .execute();

  await db.schema
    .createTable('lineups')
    .addColumn('season_id', 'integer', (col) => col.notNull())
    .addColumn('week_number', 'integer', (col) => col.notNull())
    .addColumn('year', 'integer', (col) => col.notNull())
    .addColumn('player_id', 'integer', (col) =>
      col.notNull().references('players.telegram_id').onDelete('cascade'),
    )
    .addPrimaryKeyConstraint('pk_lineups', ['season_id', 'week_number', 'year', 'player_id'])
    .execute();

  await sql`CREATE INDEX idx_day_responses_week ON day_responses(season_id, week_number, year)`.execute(
    db,
  );
  await sql`CREATE INDEX idx_weeks_season ON weeks(season_id)`.execute(db);
}

export async function down<T>(db: Kysely<T>): Promise<void> {
  await db.schema.dropTable('lineups').execute();
  await db.schema.dropTable('weeks').execute();
  await db.schema.dropTable('time_slots').execute();
  await db.schema.dropTable('day_responses').execute();
  await db.schema.dropTable('season_roster').execute();
  await db.schema.dropTable('players').execute();
  await db.schema.dropTable('config').execute();
  await db.schema.dropTable('seasons').execute();
}
