import type { Kysely } from 'kysely';
import type { DB } from '@/types/db';
import type { PlayerWithRole } from './roster';

export interface PlayerWithDmStatus extends PlayerWithRole {
  dmChatId: number | null;
  canDm: boolean;
}

export const registerDmChat = async (
  db: Kysely<DB>,
  playerId: number,
  dmChatId: number,
): Promise<void> => {
  await db
    .insertInto('playerDmChats')
    .values({ playerId, dmChatId, canDm: 1 })
    .onConflict((oc) =>
      oc.column('playerId').doUpdateSet({
        dmChatId,
        canDm: 1,
        updatedAt: new Date().toISOString(),
      }),
    )
    .execute();
};

export const getDmChatId = async (db: Kysely<DB>, playerId: number): Promise<number | null> => {
  const row = await db
    .selectFrom('playerDmChats')
    .select('dmChatId')
    .where('playerId', '=', playerId)
    .where('canDm', '=', 1)
    .executeTakeFirst();

  return row?.dmChatId ?? null;
};

export const markDmFailed = async (db: Kysely<DB>, playerId: number): Promise<void> => {
  await db
    .updateTable('playerDmChats')
    .set({ canDm: 0, updatedAt: new Date().toISOString() })
    .where('playerId', '=', playerId)
    .execute();
};

export const getRosterWithDmStatus = async (
  db: Kysely<DB>,
  seasonId: number,
): Promise<PlayerWithDmStatus[]> => {
  const rows = await db
    .selectFrom('seasonRoster')
    .innerJoin('players', 'players.telegramId', 'seasonRoster.playerId')
    .leftJoin('playerDmChats', 'playerDmChats.playerId', 'seasonRoster.playerId')
    .selectAll('players')
    .select(['seasonRoster.role', 'playerDmChats.dmChatId', 'playerDmChats.canDm'])
    .where('seasonRoster.seasonId', '=', seasonId)
    .orderBy('players.displayName', 'asc')
    .execute();

  return rows.map((row) => ({
    ...row,
    dmChatId: row.dmChatId ?? null,
    canDm: row.canDm === 1,
  }));
};
