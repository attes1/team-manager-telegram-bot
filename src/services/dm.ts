import { GrammyError } from 'grammy';
import type { Kysely } from 'kysely';
import type { DB } from '@/types/db';

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

export const isDmBlockedError = (err: unknown): boolean => {
  return err instanceof GrammyError && err.error_code === 403;
};
