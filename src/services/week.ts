import type { Kysely } from 'kysely';
import type { DB } from '../types/db';
import type { Day, WeekType } from '../validation';

export interface Week {
  seasonId: number;
  weekNumber: number;
  year: number;
  type: WeekType;
  matchDay: Day | null;
  matchTime: string | null;
}

const toWeek = (row: {
  season_id: number;
  week_number: number;
  year: number;
  type: string;
  match_day: string | null;
  match_time: string | null;
}): Week => ({
  seasonId: row.season_id,
  weekNumber: row.week_number,
  year: row.year,
  type: row.type as WeekType,
  matchDay: row.match_day as Day | null,
  matchTime: row.match_time,
});

export const setWeekType = async (
  db: Kysely<DB>,
  seasonId: number,
  weekNumber: number,
  year: number,
  type: WeekType,
): Promise<Week> => {
  const row = await db
    .insertInto('weeks')
    .values({
      season_id: seasonId,
      week_number: weekNumber,
      year,
      type,
    })
    .onConflict((oc) =>
      oc.columns(['season_id', 'week_number', 'year']).doUpdateSet({
        type,
      }),
    )
    .returningAll()
    .executeTakeFirstOrThrow();

  return toWeek(row);
};

export const getWeek = async (
  db: Kysely<DB>,
  seasonId: number,
  weekNumber: number,
  year: number,
): Promise<Week | undefined> => {
  const row = await db
    .selectFrom('weeks')
    .selectAll()
    .where('season_id', '=', seasonId)
    .where('week_number', '=', weekNumber)
    .where('year', '=', year)
    .executeTakeFirst();

  return row ? toWeek(row) : undefined;
};
