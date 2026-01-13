import type { Kysely } from 'kysely';
import type { Day } from '../lib/schemas';
import type { DB, Player, Week } from '../types/db';

export interface SetMatchTimeParams {
  seasonId: number;
  weekNumber: number;
  year: number;
  matchDay: Day;
  matchTime: string;
}

export interface WeekParams {
  seasonId: number;
  weekNumber: number;
  year: number;
}

export interface LineupPlayerParams {
  seasonId: number;
  weekNumber: number;
  year: number;
  playerId: number;
}

export interface SetLineupParams {
  seasonId: number;
  weekNumber: number;
  year: number;
  playerIds: number[];
}

export const setMatchTime = async (db: Kysely<DB>, params: SetMatchTimeParams): Promise<Week> => {
  const { seasonId, weekNumber, year, matchDay, matchTime } = params;

  return db
    .insertInto('weeks')
    .values({ seasonId, weekNumber, year, matchDay, matchTime })
    .onConflict((oc) =>
      oc.columns(['seasonId', 'weekNumber', 'year']).doUpdateSet({ matchDay, matchTime }),
    )
    .returningAll()
    .executeTakeFirstOrThrow();
};

export const getMatchInfo = async (
  db: Kysely<DB>,
  params: WeekParams,
): Promise<Week | undefined> => {
  const { seasonId, weekNumber, year } = params;

  return db
    .selectFrom('weeks')
    .selectAll()
    .where('seasonId', '=', seasonId)
    .where('weekNumber', '=', weekNumber)
    .where('year', '=', year)
    .executeTakeFirst();
};

export const addPlayerToLineup = async (
  db: Kysely<DB>,
  params: LineupPlayerParams,
): Promise<boolean> => {
  const { seasonId, weekNumber, year, playerId } = params;

  const existing = await db
    .selectFrom('lineups')
    .select('playerId')
    .where('seasonId', '=', seasonId)
    .where('weekNumber', '=', weekNumber)
    .where('year', '=', year)
    .where('playerId', '=', playerId)
    .executeTakeFirst();

  if (existing) {
    return false;
  }

  await db.insertInto('lineups').values({ seasonId, weekNumber, year, playerId }).execute();

  return true;
};

export const removePlayerFromLineup = async (
  db: Kysely<DB>,
  params: LineupPlayerParams,
): Promise<boolean> => {
  const { seasonId, weekNumber, year, playerId } = params;

  const result = await db
    .deleteFrom('lineups')
    .where('seasonId', '=', seasonId)
    .where('weekNumber', '=', weekNumber)
    .where('year', '=', year)
    .where('playerId', '=', playerId)
    .executeTakeFirst();

  return result.numDeletedRows > 0n;
};

export const setLineup = async (db: Kysely<DB>, params: SetLineupParams): Promise<void> => {
  const { seasonId, weekNumber, year, playerIds } = params;

  await db
    .deleteFrom('lineups')
    .where('seasonId', '=', seasonId)
    .where('weekNumber', '=', weekNumber)
    .where('year', '=', year)
    .execute();

  if (playerIds.length > 0) {
    await db
      .insertInto('lineups')
      .values(playerIds.map((playerId) => ({ seasonId, weekNumber, year, playerId })))
      .execute();
  }
};

export const getLineup = async (db: Kysely<DB>, params: WeekParams): Promise<Player[]> => {
  const { seasonId, weekNumber, year } = params;

  return db
    .selectFrom('lineups')
    .innerJoin('players', 'players.telegramId', 'lineups.playerId')
    .select(['players.telegramId', 'players.displayName', 'players.username', 'players.createdAt'])
    .where('lineups.seasonId', '=', seasonId)
    .where('lineups.weekNumber', '=', weekNumber)
    .where('lineups.year', '=', year)
    .execute();
};

export const clearLineup = async (db: Kysely<DB>, params: WeekParams): Promise<boolean> => {
  const { seasonId, weekNumber, year } = params;

  const result = await db
    .deleteFrom('lineups')
    .where('seasonId', '=', seasonId)
    .where('weekNumber', '=', weekNumber)
    .where('year', '=', year)
    .executeTakeFirst();

  return result.numDeletedRows > 0n;
};
