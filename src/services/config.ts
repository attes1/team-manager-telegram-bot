import type { Kysely } from 'kysely';
import { z } from 'zod';
import {
  configSchema,
  daySchema,
  daysListSchema,
  languageSchema,
  onOffSchema,
  type ParsedConfig,
  pollTimesSchema,
  publicCommandsModeSchema,
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
  weekChangeDay: daySchema,
  weekChangeTime: timeSchema,
  reminderDay: daySchema,
  reminderTime: timeSchema,
  remindersMode: remindersModeSchema,
  matchDay: daySchema,
  matchTime: timeSchema,
  lineupSize: z.coerce.number().int().min(1).max(20),
  matchDayReminderMode: remindersModeSchema,
  matchDayReminderTime: timeSchema,
  publicAnnouncements: onOffSchema,
  publicCommandsMode: publicCommandsModeSchema,
  menuExpirationHours: z.coerce.number().int().min(1).max(168),
  menuCleanupTime: timeSchema,
};

export type { ParsedConfig as Config };

const VALID_CONFIG_KEYS = [
  'language',
  'pollDay',
  'pollTime',
  'pollDays',
  'pollTimes',
  'weekChangeDay',
  'weekChangeTime',
  'reminderDay',
  'reminderTime',
  'remindersMode',
  'matchDay',
  'matchTime',
  'lineupSize',
  'matchDayReminderMode',
  'matchDayReminderTime',
  'publicAnnouncements',
  'publicCommandsMode',
  'menuExpirationHours',
  'menuCleanupTime',
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

  const numericKeys: ReadonlyArray<string> = ['lineupSize', 'menuExpirationHours'];
  const updateValue: string | number = numericKeys.includes(key) ? Number(value) : value;

  const result = await db
    .updateTable('config')
    .set({ [key]: updateValue })
    .where('seasonId', '=', seasonId)
    .executeTakeFirst();

  return result.numUpdatedRows > 0n;
};
