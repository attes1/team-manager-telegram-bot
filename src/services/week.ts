import type { Kysely } from 'kysely';
import type { DB, Week } from '../types/db';
import type { WeekType } from '../validation';

export type { Week };

export const setWeekType = async (
  db: Kysely<DB>,
  seasonId: number,
  weekNumber: number,
  year: number,
  type: WeekType,
): Promise<Week> => {
  return db
    .insertInto('weeks')
    .values({ seasonId, weekNumber, year, type })
    .onConflict((oc) => oc.columns(['seasonId', 'weekNumber', 'year']).doUpdateSet({ type }))
    .returningAll()
    .executeTakeFirstOrThrow();
};

export const getWeek = async (
  db: Kysely<DB>,
  seasonId: number,
  weekNumber: number,
  year: number,
): Promise<Week | undefined> => {
  return db
    .selectFrom('weeks')
    .selectAll()
    .where('seasonId', '=', seasonId)
    .where('weekNumber', '=', weekNumber)
    .where('year', '=', year)
    .executeTakeFirst();
};
