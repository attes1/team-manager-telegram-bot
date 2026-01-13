import type { Kysely } from 'kysely';
import type { DB } from '../types/db';
import type { RemindersMode } from '../validation';

export interface Config {
  seasonId: number;
  language: string;
  pollDay: string;
  pollTime: string;
  pollDays: string;
  pollTimes: string;
  reminderDay: string;
  reminderTime: string;
  remindersMode: RemindersMode;
  matchDay: string;
  matchTime: string;
  lineupSize: number;
}

const toConfig = (row: {
  season_id: number;
  language: string;
  poll_day: string;
  poll_time: string;
  poll_days: string;
  poll_times: string;
  reminder_day: string;
  reminder_time: string;
  reminders_mode: string;
  match_day: string;
  match_time: string;
  lineup_size: number;
}): Config => ({
  seasonId: row.season_id,
  language: row.language,
  pollDay: row.poll_day,
  pollTime: row.poll_time,
  pollDays: row.poll_days,
  pollTimes: row.poll_times,
  reminderDay: row.reminder_day,
  reminderTime: row.reminder_time,
  remindersMode: row.reminders_mode as RemindersMode,
  matchDay: row.match_day,
  matchTime: row.match_time,
  lineupSize: row.lineup_size,
});

const VALID_CONFIG_KEYS = [
  'language',
  'poll_day',
  'poll_time',
  'poll_days',
  'poll_times',
  'reminder_day',
  'reminder_time',
  'reminders_mode',
  'match_day',
  'match_time',
  'lineup_size',
] as const;

type ConfigKey = (typeof VALID_CONFIG_KEYS)[number];

const isValidConfigKey = (key: string): key is ConfigKey =>
  VALID_CONFIG_KEYS.includes(key as ConfigKey);

export const getConfig = async (db: Kysely<DB>, seasonId: number): Promise<Config | undefined> => {
  const row = await db
    .selectFrom('config')
    .selectAll()
    .where('season_id', '=', seasonId)
    .executeTakeFirst();

  return row ? toConfig(row) : undefined;
};

export const updateConfig = async (
  db: Kysely<DB>,
  seasonId: number,
  key: string,
  value: string,
): Promise<boolean> => {
  if (!isValidConfigKey(key)) {
    throw new Error(`Invalid config key: ${key}`);
  }

  const updateValue = key === 'lineup_size' ? Number(value) : value;

  const result = await db
    .updateTable('config')
    .set({ [key]: updateValue })
    .where('season_id', '=', seasonId)
    .executeTakeFirst();

  return result.numUpdatedRows > 0n;
};
