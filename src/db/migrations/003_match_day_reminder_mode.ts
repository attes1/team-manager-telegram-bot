import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { DB } from '../../types/db';

export const up = async (db: Kysely<DB>) => {
  // SQLite doesn't support renaming columns or changing types directly
  // We need to create a new table, copy data, drop old, and rename

  // Create new table with correct schema (preserving all original CHECK constraints)
  await sql`
    CREATE TABLE config_new (
      season_id INTEGER PRIMARY KEY REFERENCES seasons(id) ON DELETE CASCADE,
      language TEXT NOT NULL DEFAULT 'fi',
      poll_day TEXT NOT NULL DEFAULT 'sun',
      poll_time TEXT NOT NULL DEFAULT '10:00' CHECK(poll_time GLOB '[0-2][0-9]:[0-5][0-9]'),
      poll_days TEXT NOT NULL DEFAULT 'mon,tue,wed,thu,fri,sat,sun',
      poll_times TEXT NOT NULL DEFAULT '19,20,21',
      reminder_day TEXT NOT NULL DEFAULT 'wed',
      reminder_time TEXT NOT NULL DEFAULT '18:00' CHECK(reminder_time GLOB '[0-2][0-9]:[0-5][0-9]'),
      reminders_mode TEXT NOT NULL DEFAULT 'quiet' CHECK(reminders_mode IN ('ping', 'quiet', 'off')),
      match_day TEXT NOT NULL DEFAULT 'sun',
      match_time TEXT NOT NULL DEFAULT '20:00' CHECK(match_time GLOB '[0-2][0-9]:[0-5][0-9]'),
      lineup_size INTEGER NOT NULL DEFAULT 5,
      match_day_reminder_mode TEXT NOT NULL DEFAULT 'quiet' CHECK(match_day_reminder_mode IN ('ping', 'quiet', 'off')),
      match_day_reminder_time TEXT NOT NULL DEFAULT '18:00' CHECK(match_day_reminder_time GLOB '[0-2][0-9]:[0-5][0-9]')
    )
  `.execute(db);

  // Copy data, converting boolean to mode
  await sql`
    INSERT INTO config_new (
      season_id, language, poll_day, poll_time, poll_days, poll_times,
      reminder_day, reminder_time, reminders_mode, match_day, match_time,
      lineup_size, match_day_reminder_mode, match_day_reminder_time
    )
    SELECT
      season_id, language, poll_day, poll_time, poll_days, poll_times,
      reminder_day, reminder_time, reminders_mode, match_day, match_time,
      lineup_size,
      CASE WHEN match_day_reminder_enabled = 1 THEN 'quiet' ELSE 'off' END,
      match_day_reminder_time
    FROM config
  `.execute(db);

  // Drop old table
  await sql`DROP TABLE config`.execute(db);

  // Rename new table
  await sql`ALTER TABLE config_new RENAME TO config`.execute(db);
};

export const down = async (db: Kysely<DB>) => {
  // Create old table structure (preserving all original CHECK constraints)
  await sql`
    CREATE TABLE config_old (
      season_id INTEGER PRIMARY KEY REFERENCES seasons(id) ON DELETE CASCADE,
      language TEXT NOT NULL DEFAULT 'fi',
      poll_day TEXT NOT NULL DEFAULT 'sun',
      poll_time TEXT NOT NULL DEFAULT '10:00' CHECK(poll_time GLOB '[0-2][0-9]:[0-5][0-9]'),
      poll_days TEXT NOT NULL DEFAULT 'mon,tue,wed,thu,fri,sat,sun',
      poll_times TEXT NOT NULL DEFAULT '19,20,21',
      reminder_day TEXT NOT NULL DEFAULT 'wed',
      reminder_time TEXT NOT NULL DEFAULT '18:00' CHECK(reminder_time GLOB '[0-2][0-9]:[0-5][0-9]'),
      reminders_mode TEXT NOT NULL DEFAULT 'quiet' CHECK(reminders_mode IN ('ping', 'quiet', 'off')),
      match_day TEXT NOT NULL DEFAULT 'sun',
      match_time TEXT NOT NULL DEFAULT '20:00' CHECK(match_time GLOB '[0-2][0-9]:[0-5][0-9]'),
      lineup_size INTEGER NOT NULL DEFAULT 5,
      match_day_reminder_enabled INTEGER NOT NULL DEFAULT 1,
      match_day_reminder_time TEXT NOT NULL DEFAULT '18:00' CHECK(match_day_reminder_time GLOB '[0-2][0-9]:[0-5][0-9]')
    )
  `.execute(db);

  // Copy data back, converting mode to boolean
  await sql`
    INSERT INTO config_old (
      season_id, language, poll_day, poll_time, poll_days, poll_times,
      reminder_day, reminder_time, reminders_mode, match_day, match_time,
      lineup_size, match_day_reminder_enabled, match_day_reminder_time
    )
    SELECT
      season_id, language, poll_day, poll_time, poll_days, poll_times,
      reminder_day, reminder_time, reminders_mode, match_day, match_time,
      lineup_size,
      CASE WHEN match_day_reminder_mode = 'off' THEN 0 ELSE 1 END,
      match_day_reminder_time
    FROM config
  `.execute(db);

  // Drop new table
  await sql`DROP TABLE config`.execute(db);

  // Rename old table
  await sql`ALTER TABLE config_old RENAME TO config`.execute(db);
};
