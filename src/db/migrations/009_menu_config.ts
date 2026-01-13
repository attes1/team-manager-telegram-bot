import { type Kysely, sql } from 'kysely';

export const up = async <T>(db: Kysely<T>) => {
  await sql`
    CREATE TABLE config_new (
      season_id INTEGER PRIMARY KEY REFERENCES seasons(id) ON DELETE CASCADE,
      language TEXT NOT NULL DEFAULT 'fi',
      poll_day TEXT NOT NULL DEFAULT 'sun',
      poll_time TEXT NOT NULL DEFAULT '10:00' CHECK(poll_time GLOB '[0-2][0-9]:[0-5][0-9]'),
      poll_days TEXT NOT NULL DEFAULT 'mon,tue,wed,thu,fri,sat,sun',
      poll_times TEXT NOT NULL DEFAULT '19,20,21',
      week_change_day TEXT NOT NULL DEFAULT 'sun',
      week_change_time TEXT NOT NULL DEFAULT '10:00' CHECK(week_change_time GLOB '[0-2][0-9]:[0-5][0-9]'),
      reminder_day TEXT NOT NULL DEFAULT 'wed',
      reminder_time TEXT NOT NULL DEFAULT '18:00' CHECK(reminder_time GLOB '[0-2][0-9]:[0-5][0-9]'),
      reminders_mode TEXT NOT NULL DEFAULT 'quiet' CHECK(reminders_mode IN ('ping', 'quiet', 'off')),
      match_day TEXT NOT NULL DEFAULT 'sun',
      match_time TEXT NOT NULL DEFAULT '20:00' CHECK(match_time GLOB '[0-2][0-9]:[0-5][0-9]'),
      lineup_size INTEGER NOT NULL DEFAULT 5,
      match_day_reminder_mode TEXT NOT NULL DEFAULT 'quiet' CHECK(match_day_reminder_mode IN ('ping', 'quiet', 'off')),
      match_day_reminder_time TEXT NOT NULL DEFAULT '18:00' CHECK(match_day_reminder_time GLOB '[0-2][0-9]:[0-5][0-9]'),
      public_announcements TEXT NOT NULL DEFAULT 'on' CHECK(public_announcements IN ('on', 'off')),
      menu_expiration_hours INTEGER NOT NULL DEFAULT 24 CHECK(menu_expiration_hours >= 1 AND menu_expiration_hours <= 168),
      menu_cleanup_time TEXT NOT NULL DEFAULT '04:00' CHECK(menu_cleanup_time GLOB '[0-2][0-9]:[0-5][0-9]')
    )
  `.execute(db);

  await sql`
    INSERT INTO config_new (
      season_id, language, poll_day, poll_time, poll_days, poll_times,
      week_change_day, week_change_time,
      reminder_day, reminder_time, reminders_mode, match_day, match_time,
      lineup_size, match_day_reminder_mode, match_day_reminder_time, public_announcements
    )
    SELECT
      season_id, language, poll_day, poll_time, poll_days, poll_times,
      week_change_day, week_change_time,
      reminder_day, reminder_time, reminders_mode, match_day, match_time,
      lineup_size, match_day_reminder_mode, match_day_reminder_time, public_announcements
    FROM config
  `.execute(db);

  await sql`DROP TABLE config`.execute(db);
  await sql`ALTER TABLE config_new RENAME TO config`.execute(db);
};

export const down = async <T>(db: Kysely<T>) => {
  await sql`
    CREATE TABLE config_old (
      season_id INTEGER PRIMARY KEY REFERENCES seasons(id) ON DELETE CASCADE,
      language TEXT NOT NULL DEFAULT 'fi',
      poll_day TEXT NOT NULL DEFAULT 'sun',
      poll_time TEXT NOT NULL DEFAULT '10:00' CHECK(poll_time GLOB '[0-2][0-9]:[0-5][0-9]'),
      poll_days TEXT NOT NULL DEFAULT 'mon,tue,wed,thu,fri,sat,sun',
      poll_times TEXT NOT NULL DEFAULT '19,20,21',
      week_change_day TEXT NOT NULL DEFAULT 'sun',
      week_change_time TEXT NOT NULL DEFAULT '10:00' CHECK(week_change_time GLOB '[0-2][0-9]:[0-5][0-9]'),
      reminder_day TEXT NOT NULL DEFAULT 'wed',
      reminder_time TEXT NOT NULL DEFAULT '18:00' CHECK(reminder_time GLOB '[0-2][0-9]:[0-5][0-9]'),
      reminders_mode TEXT NOT NULL DEFAULT 'quiet' CHECK(reminders_mode IN ('ping', 'quiet', 'off')),
      match_day TEXT NOT NULL DEFAULT 'sun',
      match_time TEXT NOT NULL DEFAULT '20:00' CHECK(match_time GLOB '[0-2][0-9]:[0-5][0-9]'),
      lineup_size INTEGER NOT NULL DEFAULT 5,
      match_day_reminder_mode TEXT NOT NULL DEFAULT 'quiet' CHECK(match_day_reminder_mode IN ('ping', 'quiet', 'off')),
      match_day_reminder_time TEXT NOT NULL DEFAULT '18:00' CHECK(match_day_reminder_time GLOB '[0-2][0-9]:[0-5][0-9]'),
      public_announcements TEXT NOT NULL DEFAULT 'on' CHECK(public_announcements IN ('on', 'off'))
    )
  `.execute(db);

  await sql`
    INSERT INTO config_old (
      season_id, language, poll_day, poll_time, poll_days, poll_times,
      week_change_day, week_change_time,
      reminder_day, reminder_time, reminders_mode, match_day, match_time,
      lineup_size, match_day_reminder_mode, match_day_reminder_time, public_announcements
    )
    SELECT
      season_id, language, poll_day, poll_time, poll_days, poll_times,
      week_change_day, week_change_time,
      reminder_day, reminder_time, reminders_mode, match_day, match_time,
      lineup_size, match_day_reminder_mode, match_day_reminder_time, public_announcements
    FROM config
  `.execute(db);

  await sql`DROP TABLE config`.execute(db);
  await sql`ALTER TABLE config_old RENAME TO config`.execute(db);
};
