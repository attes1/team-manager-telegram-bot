import type { Kysely } from 'kysely';
import { z } from 'zod';
import {
  configSchema,
  daySchema,
  daysListSchema,
  languageSchema,
  type ParsedConfig,
  pollTimesSchema,
  remindersModeSchema,
  timeSchema,
} from '../lib/schemas';
import type { DB } from '../types/db';

const configValidators: Record<string, z.ZodTypeAny> = {
  language: languageSchema,
  pollDay: daySchema,
  pollTime: timeSchema,
  pollDays: daysListSchema,
  pollTimes: pollTimesSchema,
  reminderDay: daySchema,
  reminderTime: timeSchema,
  remindersMode: remindersModeSchema,
  matchDay: daySchema,
  matchTime: timeSchema,
  lineupSize: z.coerce.number().int().min(1).max(20),
  matchDayReminderEnabled: z.enum(['true', 'false', '1', '0', 'on', 'off']),
  matchDayReminderTime: timeSchema,
};

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

  const validator = configValidators[key];
  if (validator) {
    validator.parse(value);
  }

  let updateValue: string | number = value;
  if (key === 'lineupSize') {
    updateValue = Number(value);
  } else if (key === 'matchDayReminderEnabled') {
    updateValue = value === 'true' || value === '1' || value === 'on' ? 1 : 0;
  }

  const result = await db
    .updateTable('config')
    .set({ [key]: updateValue })
    .where('seasonId', '=', seasonId)
    .executeTakeFirst();

  return result.numUpdatedRows > 0n;
};
