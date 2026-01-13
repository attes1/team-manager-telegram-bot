import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import { env } from '../env';
import type { DB, Season } from '../types/db';

export type { Season };

export const startSeason = async (db: Kysely<DB>, name: string): Promise<Season> => {
  await db
    .updateTable('seasons')
    .set({ status: 'ended', endedAt: sql`CURRENT_TIMESTAMP` })
    .where('status', '=', 'active')
    .execute();

  const season = await db
    .insertInto('seasons')
    .values({ name })
    .returningAll()
    .executeTakeFirstOrThrow();

  await db
    .insertInto('config')
    .values({
      seasonId: season.id,
      language: env.DEFAULT_LANGUAGE,
    })
    .execute();

  return season;
};

export const endSeason = async (db: Kysely<DB>): Promise<boolean> => {
  const result = await db
    .updateTable('seasons')
    .set({ status: 'ended', endedAt: sql`CURRENT_TIMESTAMP` })
    .where('status', '=', 'active')
    .executeTakeFirst();

  return result.numUpdatedRows > 0n;
};

export const getActiveSeason = async (db: Kysely<DB>): Promise<Season | undefined> => {
  return db.selectFrom('seasons').selectAll().where('status', '=', 'active').executeTakeFirst();
};

export const getSeasonById = async (db: Kysely<DB>, id: number): Promise<Season | undefined> => {
  return db.selectFrom('seasons').selectAll().where('id', '=', id).executeTakeFirst();
};
