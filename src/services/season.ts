import type { Kysely } from 'kysely';
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

export const getActiveSeason = async (db: Kysely<DB>): Promise<Season | undefined> => {
  const row = await db
    .selectFrom('seasons')
    .selectAll()
    .where('status', '=', 'active')
    .executeTakeFirst();

  return row ? toSeason(row) : undefined;
};
