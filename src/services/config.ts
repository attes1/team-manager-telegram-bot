import type { Kysely } from 'kysely';
import { configSchema, type ParsedConfig } from '../lib/schemas';
import type { DB } from '../types/db';

export type { ParsedConfig as Config };

const VALID_CONFIG_KEYS = [
  'language',
  'pollDay',
  'pollTime',
  'pollDays',
  'pollTimes',
  'reminderDay',
  'reminderTime',
  'remindersMode',
  'matchDay',
  'matchTime',
  'lineupSize',
  'matchDayReminderEnabled',
  'matchDayReminderTime',
] as const;

type ConfigKey = (typeof VALID_CONFIG_KEYS)[number];

const isValidConfigKey = (key: string): key is ConfigKey =>
  VALID_CONFIG_KEYS.includes(key as ConfigKey);

export const getConfig = async (
  db: Kysely<DB>,
  seasonId: number,
): Promise<ParsedConfig | undefined> => {
  const raw = await db
    .selectFrom('config')
    .selectAll()
    .where('seasonId', '=', seasonId)
    .executeTakeFirst();

  if (!raw) {
    return undefined;
  }

  return configSchema.parse(raw);
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

  let updateValue: string | number | boolean = value;
  if (key === 'lineupSize') {
    updateValue = Number(value);
  } else if (key === 'matchDayReminderEnabled') {
    updateValue = value === 'true' || value === '1' || value === 'on';
  }

  const result = await db
    .updateTable('config')
    .set({ [key]: updateValue })
    .where('seasonId', '=', seasonId)
    .executeTakeFirst();

  return result.numUpdatedRows > 0n;
};
