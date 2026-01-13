import { type Kysely, sql } from 'kysely';

export const up = async <T>(db: Kysely<T>) => {
  await sql`
    CREATE TABLE weeks_new (
      season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      year INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'match' CHECK(type IN ('match', 'practice')),
      match_day TEXT CHECK(match_day IS NULL OR match_day IN ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')),
      match_time TEXT CHECK(match_time IS NULL OR match_time GLOB '[0-2][0-9]:[0-5][0-9]'),
      opponent_name TEXT,
      opponent_url TEXT,
      PRIMARY KEY (season_id, week_number, year)
    )
  `.execute(db);

  await sql`
    INSERT INTO weeks_new (season_id, week_number, year, type, match_day, match_time)
    SELECT season_id, week_number, year, type, match_day, match_time
    FROM weeks
  `.execute(db);

  await sql`DROP TABLE weeks`.execute(db);
  await sql`ALTER TABLE weeks_new RENAME TO weeks`.execute(db);
  await sql`CREATE INDEX idx_weeks_season ON weeks(season_id)`.execute(db);
};

export const down = async <T>(db: Kysely<T>) => {
  await sql`
    CREATE TABLE weeks_old (
      season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      year INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'match' CHECK(type IN ('match', 'practice')),
      match_day TEXT CHECK(match_day IS NULL OR match_day IN ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')),
      match_time TEXT CHECK(match_time IS NULL OR match_time GLOB '[0-2][0-9]:[0-5][0-9]'),
      PRIMARY KEY (season_id, week_number, year)
    )
  `.execute(db);

  await sql`
    INSERT INTO weeks_old (season_id, week_number, year, type, match_day, match_time)
    SELECT season_id, week_number, year, type, match_day, match_time
    FROM weeks
  `.execute(db);

  await sql`DROP TABLE weeks`.execute(db);
  await sql`ALTER TABLE weeks_old RENAME TO weeks`.execute(db);
  await sql`CREATE INDEX idx_weeks_season ON weeks(season_id)`.execute(db);
};
