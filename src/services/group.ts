import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { GroupType } from '@/lib/schemas';
import type { DB, Group } from '@/types/db';

export type { Group };

export const registerGroup = async (
  db: Kysely<DB>,
  telegramId: number,
  title?: string,
): Promise<Group> => {
  const existing = await db
    .selectFrom('groups')
    .selectAll()
    .where('telegramId', '=', telegramId)
    .executeTakeFirst();

  if (existing) {
    // Reactivate if soft-deleted, update title
    return db
      .updateTable('groups')
      .set({
        removedAt: null,
        title: title ?? existing.title,
      })
      .where('telegramId', '=', telegramId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  return db
    .insertInto('groups')
    .values({
      telegramId,
      title: title ?? null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
};

export const unregisterGroup = async (db: Kysely<DB>, telegramId: number): Promise<boolean> => {
  const result = await db
    .updateTable('groups')
    .set({ removedAt: sql`CURRENT_TIMESTAMP` })
    .where('telegramId', '=', telegramId)
    .where('removedAt', 'is', null)
    .executeTakeFirst();

  return result.numUpdatedRows > 0n;
};

export const getGroup = async (db: Kysely<DB>, telegramId: number): Promise<Group | undefined> => {
  return db
    .selectFrom('groups')
    .selectAll()
    .where('telegramId', '=', telegramId)
    .where('removedAt', 'is', null)
    .executeTakeFirst();
};

export const getTeamGroup = async (db: Kysely<DB>): Promise<Group | undefined> => {
  return db
    .selectFrom('groups')
    .selectAll()
    .where('type', '=', 'team')
    .where('removedAt', 'is', null)
    .executeTakeFirst();
};

export const getTeamGroupId = async (db: Kysely<DB>): Promise<number | null> => {
  const group = await getTeamGroup(db);
  return group?.telegramId ?? null;
};

export const getPublicGroups = async (db: Kysely<DB>): Promise<Group[]> => {
  return db
    .selectFrom('groups')
    .selectAll()
    .where('type', '=', 'public')
    .where('removedAt', 'is', null)
    .execute();
};

export const getPublicGroupIds = async (db: Kysely<DB>): Promise<number[]> => {
  const groups = await getPublicGroups(db);
  return groups.map((g) => g.telegramId);
};

export const setGroupType = async (
  db: Kysely<DB>,
  telegramId: number,
  type: GroupType,
): Promise<Group | undefined> => {
  // If setting to team, first demote any existing team group to public
  if (type === 'team') {
    await db
      .updateTable('groups')
      .set({ type: 'public' })
      .where('type', '=', 'team')
      .where('removedAt', 'is', null)
      .execute();
  }

  return db
    .updateTable('groups')
    .set({ type })
    .where('telegramId', '=', telegramId)
    .where('removedAt', 'is', null)
    .returningAll()
    .executeTakeFirst();
};

export const isTeamGroup = async (db: Kysely<DB>, telegramId: number): Promise<boolean> => {
  const group = await getGroup(db, telegramId);
  return group?.type === 'team';
};
