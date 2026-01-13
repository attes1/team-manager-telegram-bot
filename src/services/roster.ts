import type { Kysely } from 'kysely';
import type { DB, Player } from '../types/db';

export type { Player };

export interface AddPlayerParams {
  seasonId: number;
  telegramId: number;
  displayName: string;
  username?: string | null;
}

export const addPlayerToRoster = async (
  db: Kysely<DB>,
  params: AddPlayerParams,
): Promise<Player> => {
  const { seasonId, telegramId, displayName, username = null } = params;

  const player = await db
    .insertInto('players')
    .values({ telegramId, displayName, username })
    .onConflict((oc) => oc.column('telegramId').doUpdateSet({ displayName, username }))
    .returningAll()
    .executeTakeFirstOrThrow();

  await db
    .insertInto('seasonRoster')
    .values({ seasonId, playerId: telegramId })
    .onConflict((oc) => oc.columns(['seasonId', 'playerId']).doNothing())
    .execute();

  return player;
};

export const removePlayerFromRoster = async (
  db: Kysely<DB>,
  seasonId: number,
  telegramId: number,
): Promise<boolean> => {
  const result = await db
    .deleteFrom('seasonRoster')
    .where('seasonId', '=', seasonId)
    .where('playerId', '=', telegramId)
    .executeTakeFirst();

  return result.numDeletedRows > 0n;
};

export const getRoster = async (db: Kysely<DB>, seasonId: number): Promise<Player[]> => {
  const rows = await db
    .selectFrom('seasonRoster')
    .innerJoin('players', 'players.telegramId', 'seasonRoster.playerId')
    .selectAll('players')
    .where('seasonRoster.seasonId', '=', seasonId)
    .orderBy('players.displayName', 'asc')
    .execute();

  return rows;
};

export const isPlayerInRoster = async (
  db: Kysely<DB>,
  seasonId: number,
  telegramId: number,
): Promise<boolean> => {
  const row = await db
    .selectFrom('seasonRoster')
    .select('playerId')
    .where('seasonId', '=', seasonId)
    .where('playerId', '=', telegramId)
    .executeTakeFirst();

  return row !== undefined;
};

export const getPlayerByTelegramId = async (
  db: Kysely<DB>,
  telegramId: number,
): Promise<Player | undefined> => {
  const row = await db
    .selectFrom('players')
    .selectAll()
    .where('telegramId', '=', telegramId)
    .executeTakeFirst();

  return row;
};
