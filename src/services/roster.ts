import type { Kysely } from 'kysely';
import type { DB } from '../types/db';

export interface Player {
  telegramId: number;
  username: string | null;
  displayName: string;
  createdAt: string;
}

export interface AddPlayerParams {
  seasonId: number;
  telegramId: number;
  displayName: string;
  username?: string | null;
}

const toPlayer = (row: {
  telegram_id: number;
  username: string | null;
  display_name: string;
  created_at: string;
}): Player => ({
  telegramId: row.telegram_id,
  username: row.username,
  displayName: row.display_name,
  createdAt: row.created_at,
});

export const addPlayerToRoster = async (
  db: Kysely<DB>,
  params: AddPlayerParams,
): Promise<Player> => {
  const { seasonId, telegramId, displayName, username = null } = params;

  const player = await db
    .insertInto('players')
    .values({
      telegram_id: telegramId,
      display_name: displayName,
      username,
    })
    .onConflict((oc) =>
      oc.column('telegram_id').doUpdateSet({
        display_name: displayName,
        username,
      }),
    )
    .returningAll()
    .executeTakeFirstOrThrow();

  await db
    .insertInto('season_roster')
    .values({
      season_id: seasonId,
      player_id: telegramId,
    })
    .onConflict((oc) => oc.columns(['season_id', 'player_id']).doNothing())
    .execute();

  return toPlayer(player);
};

export const removePlayerFromRoster = async (
  db: Kysely<DB>,
  seasonId: number,
  telegramId: number,
): Promise<boolean> => {
  const result = await db
    .deleteFrom('season_roster')
    .where('season_id', '=', seasonId)
    .where('player_id', '=', telegramId)
    .executeTakeFirst();

  return result.numDeletedRows > 0n;
};

export const getRoster = async (db: Kysely<DB>, seasonId: number): Promise<Player[]> => {
  const rows = await db
    .selectFrom('season_roster')
    .innerJoin('players', 'players.telegram_id', 'season_roster.player_id')
    .selectAll('players')
    .where('season_roster.season_id', '=', seasonId)
    .orderBy('players.display_name', 'asc')
    .execute();

  return rows.map(toPlayer);
};

export const isPlayerInRoster = async (
  db: Kysely<DB>,
  seasonId: number,
  telegramId: number,
): Promise<boolean> => {
  const row = await db
    .selectFrom('season_roster')
    .select('player_id')
    .where('season_id', '=', seasonId)
    .where('player_id', '=', telegramId)
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
    .where('telegram_id', '=', telegramId)
    .executeTakeFirst();

  return row ? toPlayer(row) : undefined;
};
