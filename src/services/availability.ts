import type { Kysely } from 'kysely';
import type { DB } from '../types/db';
import type { AvailabilityStatus, Day } from '../validation';

export interface DayAvailability {
  day: Day;
  status: AvailabilityStatus;
  timeSlots: string[];
}

export interface SetDayAvailabilityParams {
  seasonId: number;
  playerId: number;
  weekNumber: number;
  year: number;
  day: Day;
  status: AvailabilityStatus;
  timeSlots: string[];
}

export interface GetDayAvailabilityParams {
  seasonId: number;
  playerId: number;
  weekNumber: number;
  year: number;
  day: Day;
}

export interface GetPlayerWeekParams {
  seasonId: number;
  playerId: number;
  weekNumber: number;
  year: number;
}

export interface GetWeekParams {
  seasonId: number;
  weekNumber: number;
  year: number;
}

export interface PlayerWeekAvailability {
  playerId: number;
  displayName: string;
  responses: Partial<Record<Day, DayAvailability>>;
}

export const setDayAvailability = async (
  db: Kysely<DB>,
  params: SetDayAvailabilityParams,
): Promise<DayAvailability> => {
  const { seasonId, playerId, weekNumber, year, day, status, timeSlots } = params;

  const existingResponse = await db
    .selectFrom('day_responses')
    .select('id')
    .where('season_id', '=', seasonId)
    .where('player_id', '=', playerId)
    .where('week_number', '=', weekNumber)
    .where('year', '=', year)
    .where('day', '=', day)
    .executeTakeFirst();

  let responseId: number;

  if (existingResponse) {
    await db
      .updateTable('day_responses')
      .set({ status })
      .where('id', '=', existingResponse.id)
      .execute();
    responseId = existingResponse.id;

    await db.deleteFrom('time_slots').where('day_response_id', '=', responseId).execute();
  } else {
    const inserted = await db
      .insertInto('day_responses')
      .values({
        season_id: seasonId,
        player_id: playerId,
        week_number: weekNumber,
        year,
        day,
        status,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    responseId = inserted.id;
  }

  if (timeSlots.length > 0) {
    await db
      .insertInto('time_slots')
      .values(timeSlots.map((slot) => ({ day_response_id: responseId, time_slot: slot })))
      .execute();
  }

  return { day, status, timeSlots };
};

export const getDayAvailability = async (
  db: Kysely<DB>,
  params: GetDayAvailabilityParams,
): Promise<DayAvailability | undefined> => {
  const { seasonId, playerId, weekNumber, year, day } = params;

  const response = await db
    .selectFrom('day_responses')
    .select(['id', 'day', 'status'])
    .where('season_id', '=', seasonId)
    .where('player_id', '=', playerId)
    .where('week_number', '=', weekNumber)
    .where('year', '=', year)
    .where('day', '=', day)
    .executeTakeFirst();

  if (!response) {
    return undefined;
  }

  const slots = await db
    .selectFrom('time_slots')
    .select('time_slot')
    .where('day_response_id', '=', response.id)
    .execute();

  return {
    day: response.day,
    status: response.status,
    timeSlots: slots.map((s) => s.time_slot),
  };
};

export const getPlayerWeekAvailability = async (
  db: Kysely<DB>,
  params: GetPlayerWeekParams,
): Promise<Partial<Record<Day, DayAvailability>>> => {
  const { seasonId, playerId, weekNumber, year } = params;

  const responses = await db
    .selectFrom('day_responses')
    .select(['id', 'day', 'status'])
    .where('season_id', '=', seasonId)
    .where('player_id', '=', playerId)
    .where('week_number', '=', weekNumber)
    .where('year', '=', year)
    .execute();

  if (responses.length === 0) {
    return {};
  }

  const responseIds = responses.map((r) => r.id);
  const slots = await db
    .selectFrom('time_slots')
    .select(['day_response_id', 'time_slot'])
    .where('day_response_id', 'in', responseIds)
    .execute();

  const slotsByResponseId = new Map<number, string[]>();
  for (const slot of slots) {
    const existing = slotsByResponseId.get(slot.day_response_id) ?? [];
    existing.push(slot.time_slot);
    slotsByResponseId.set(slot.day_response_id, existing);
  }

  const result: Partial<Record<Day, DayAvailability>> = {};
  for (const response of responses) {
    result[response.day] = {
      day: response.day,
      status: response.status,
      timeSlots: slotsByResponseId.get(response.id) ?? [],
    };
  }

  return result;
};

export const getWeekAvailability = async (
  db: Kysely<DB>,
  params: GetWeekParams,
): Promise<PlayerWeekAvailability[]> => {
  const { seasonId, weekNumber, year } = params;

  const responses = await db
    .selectFrom('day_responses')
    .innerJoin('players', 'players.telegram_id', 'day_responses.player_id')
    .select([
      'day_responses.id',
      'day_responses.player_id',
      'day_responses.day',
      'day_responses.status',
      'players.display_name',
    ])
    .where('day_responses.season_id', '=', seasonId)
    .where('day_responses.week_number', '=', weekNumber)
    .where('day_responses.year', '=', year)
    .execute();

  if (responses.length === 0) {
    return [];
  }

  const responseIds = responses.map((r) => r.id);
  const slots = await db
    .selectFrom('time_slots')
    .select(['day_response_id', 'time_slot'])
    .where('day_response_id', 'in', responseIds)
    .execute();

  const slotsByResponseId = new Map<number, string[]>();
  for (const slot of slots) {
    const existing = slotsByResponseId.get(slot.day_response_id) ?? [];
    existing.push(slot.time_slot);
    slotsByResponseId.set(slot.day_response_id, existing);
  }

  const playerMap = new Map<number, PlayerWeekAvailability>();
  for (const response of responses) {
    let player = playerMap.get(response.player_id);
    if (!player) {
      player = {
        playerId: response.player_id,
        displayName: response.display_name,
        responses: {},
      };
      playerMap.set(response.player_id, player);
    }
    player.responses[response.day] = {
      day: response.day,
      status: response.status,
      timeSlots: slotsByResponseId.get(response.id) ?? [],
    };
  }

  return Array.from(playerMap.values());
};

export const hasRespondedForWeek = async (
  db: Kysely<DB>,
  params: GetPlayerWeekParams,
): Promise<boolean> => {
  const { seasonId, playerId, weekNumber, year } = params;

  const count = await db
    .selectFrom('day_responses')
    .select(db.fn.count('id').as('count'))
    .where('season_id', '=', seasonId)
    .where('player_id', '=', playerId)
    .where('week_number', '=', weekNumber)
    .where('year', '=', year)
    .executeTakeFirst();

  return Number(count?.count ?? 0) > 0;
};

export const clearDayAvailability = async (
  db: Kysely<DB>,
  params: GetDayAvailabilityParams,
): Promise<boolean> => {
  const { seasonId, playerId, weekNumber, year, day } = params;

  const result = await db
    .deleteFrom('day_responses')
    .where('season_id', '=', seasonId)
    .where('player_id', '=', playerId)
    .where('week_number', '=', weekNumber)
    .where('year', '=', year)
    .where('day', '=', day)
    .executeTakeFirst();

  return result.numDeletedRows > 0n;
};
