import type { Kysely } from 'kysely';
import type { WeekType } from '../lib/schemas';
import type { DB, Week } from '../types/db';

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

export interface GetUpcomingMatchWeeksParams {
  seasonId: number;
  fromWeek: number;
  fromYear: number;
  limit?: number;
}

export const getUpcomingMatchWeeks = async (
  db: Kysely<DB>,
  params: GetUpcomingMatchWeeksParams,
): Promise<Week[]> => {
  const { seasonId, fromWeek, fromYear, limit = 10 } = params;

  return db
    .selectFrom('weeks')
    .selectAll()
    .where('seasonId', '=', seasonId)
    .where((eb) =>
      eb.or([
        eb('year', '>', fromYear),
        eb.and([eb('year', '=', fromYear), eb('weekNumber', '>=', fromWeek)]),
      ]),
    )
    .where('type', '!=', 'practice')
    .orderBy('year', 'asc')
    .orderBy('weekNumber', 'asc')
    .limit(limit)
    .execute();
};
