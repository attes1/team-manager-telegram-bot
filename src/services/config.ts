import type { Kysely } from 'kysely';
import type { Config, DB } from '../types/db';

export type { Config };

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
  'announcementsChatId',
] as const;

type ConfigKey = (typeof VALID_CONFIG_KEYS)[number];

const isValidConfigKey = (key: string): key is ConfigKey =>
  VALID_CONFIG_KEYS.includes(key as ConfigKey);

export const getConfig = async (db: Kysely<DB>, seasonId: number): Promise<Config | undefined> => {
  return db.selectFrom('config').selectAll().where('seasonId', '=', seasonId).executeTakeFirst();
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

  const updateValue = key === 'lineupSize' ? Number(value) : value;

  const result = await db
    .updateTable('config')
    .set({ [key]: updateValue })
    .where('seasonId', '=', seasonId)
    .executeTakeFirst();

  return result.numUpdatedRows > 0n;
};
