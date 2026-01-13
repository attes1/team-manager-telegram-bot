import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { DB } from '../types/db';

export interface Season {
  id: number;
  name: string;
  status: 'active' | 'ended';
  createdAt: string;
  endedAt: string | null;
}

const toSeason = (row: {
  id: number;
  name: string;
  status: string;
  created_at: string;
  ended_at: string | null;
}): Season => ({
  id: row.id,
  name: row.name,
  status: row.status as 'active' | 'ended',
  createdAt: row.created_at,
  endedAt: row.ended_at,
});

export const startSeason = async (db: Kysely<DB>, name: string): Promise<Season> => {
  await db
    .updateTable('seasons')
    .set({
      status: 'ended',
      ended_at: sql`CURRENT_TIMESTAMP`,
    })
    .where('status', '=', 'active')
    .execute();

  const season = await db
    .insertInto('seasons')
    .values({ name })
    .returningAll()
    .executeTakeFirstOrThrow();

  await db.insertInto('config').values({ season_id: season.id }).execute();

  return toSeason(season);
};

export const endSeason = async (db: Kysely<DB>): Promise<boolean> => {
  const result = await db
    .updateTable('seasons')
    .set({
      status: 'ended',
      ended_at: sql`CURRENT_TIMESTAMP`,
    })
    .where('status', '=', 'active')
    .executeTakeFirst();

  return result.numUpdatedRows > 0n;
};

export const getActiveSeason = async (db: Kysely<DB>): Promise<Season | undefined> => {
  const row = await db
    .selectFrom('seasons')
    .selectAll()
    .where('status', '=', 'active')
    .executeTakeFirst();

  return row ? toSeason(row) : undefined;
};

export const getSeasonById = async (db: Kysely<DB>, id: number): Promise<Season | undefined> => {
  const row = await db.selectFrom('seasons').selectAll().where('id', '=', id).executeTakeFirst();

  return row ? toSeason(row) : undefined;
};
