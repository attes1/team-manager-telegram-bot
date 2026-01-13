import type { Kysely } from 'kysely';
import type { DB, MenuType } from '@/types/db';

export interface ActiveMenuData {
  seasonId: number;
  chatId: number;
  userId: number;
  menuType: MenuType;
  messageId: number;
  weekNumber: number;
  year: number;
}

export const getActiveMenu = async (
  db: Kysely<DB>,
  chatId: number,
  userId: number,
  menuType: MenuType,
): Promise<{ messageId: number; weekNumber: number; year: number } | undefined> => {
  const menu = await db
    .selectFrom('activeMenus')
    .select(['messageId', 'weekNumber', 'year'])
    .where('chatId', '=', chatId)
    .where('userId', '=', userId)
    .where('menuType', '=', menuType)
    .executeTakeFirst();

  return menu;
};

export const saveActiveMenu = async (db: Kysely<DB>, data: ActiveMenuData): Promise<void> => {
  await db
    .insertInto('activeMenus')
    .values({
      seasonId: data.seasonId,
      chatId: data.chatId,
      userId: data.userId,
      menuType: data.menuType,
      messageId: data.messageId,
      weekNumber: data.weekNumber,
      year: data.year,
    })
    .onConflict((oc) =>
      oc.columns(['chatId', 'userId', 'menuType']).doUpdateSet({
        seasonId: data.seasonId,
        messageId: data.messageId,
        weekNumber: data.weekNumber,
        year: data.year,
      }),
    )
    .execute();
};

export const deleteActiveMenu = async (
  db: Kysely<DB>,
  chatId: number,
  userId: number,
  menuType: MenuType,
): Promise<void> => {
  await db
    .deleteFrom('activeMenus')
    .where('chatId', '=', chatId)
    .where('userId', '=', userId)
    .where('menuType', '=', menuType)
    .execute();
};

export const getExpiredMenus = async (
  db: Kysely<DB>,
  seasonId: number,
  expirationHours: number,
): Promise<Array<{ id: number; chatId: number; messageId: number }>> => {
  const cutoffTime = new Date(Date.now() - expirationHours * 60 * 60 * 1000).toISOString();

  return db
    .selectFrom('activeMenus')
    .select(['id', 'chatId', 'messageId'])
    .where('seasonId', '=', seasonId)
    .where('createdAt', '<', cutoffTime)
    .execute();
};

export const deleteExpiredMenus = async (
  db: Kysely<DB>,
  seasonId: number,
  expirationHours: number,
): Promise<number> => {
  const cutoffTime = new Date(Date.now() - expirationHours * 60 * 60 * 1000).toISOString();

  const result = await db
    .deleteFrom('activeMenus')
    .where('seasonId', '=', seasonId)
    .where('createdAt', '<', cutoffTime)
    .executeTakeFirst();

  return Number(result.numDeletedRows);
};
