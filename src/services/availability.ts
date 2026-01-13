import type { Kysely } from 'kysely';
import type { AvailabilityStatus, Day } from '../lib/schemas';
import type { DB } from '../types/db';

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
  username: string | null;
  responses: Partial<Record<Day, DayAvailability>>;
}

export const setDayAvailability = async (
  db: Kysely<DB>,
  params: SetDayAvailabilityParams,
): Promise<DayAvailability> => {
  const { seasonId, playerId, weekNumber, year, day, status, timeSlots } = params;

  const existingResponse = await db
    .selectFrom('dayResponses')
    .select('id')
    .where('seasonId', '=', seasonId)
    .where('playerId', '=', playerId)
    .where('weekNumber', '=', weekNumber)
    .where('year', '=', year)
    .where('day', '=', day)
    .executeTakeFirst();

  let responseId: number;

  if (existingResponse) {
    await db
      .updateTable('dayResponses')
      .set({ status })
      .where('id', '=', existingResponse.id)
      .execute();
    responseId = existingResponse.id;

    await db.deleteFrom('timeSlots').where('dayResponseId', '=', responseId).execute();
  } else {
    const inserted = await db
      .insertInto('dayResponses')
      .values({ seasonId, playerId, weekNumber, year, day, status })
      .returning('id')
      .executeTakeFirstOrThrow();
    responseId = inserted.id;
  }

  if (timeSlots.length > 0) {
    await db
      .insertInto('timeSlots')
      .values(timeSlots.map((slot) => ({ dayResponseId: responseId, timeSlot: slot })))
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
    .selectFrom('dayResponses')
    .select(['id', 'day', 'status'])
    .where('seasonId', '=', seasonId)
    .where('playerId', '=', playerId)
    .where('weekNumber', '=', weekNumber)
    .where('year', '=', year)
    .where('day', '=', day)
    .executeTakeFirst();

  if (!response) {
    return undefined;
  }

  const slots = await db
    .selectFrom('timeSlots')
    .select('timeSlot')
    .where('dayResponseId', '=', response.id)
    .execute();

  return {
    day: response.day,
    status: response.status,
    timeSlots: slots.map((s) => s.timeSlot),
  };
};

export const getPlayerWeekAvailability = async (
  db: Kysely<DB>,
  params: GetPlayerWeekParams,
): Promise<Partial<Record<Day, DayAvailability>>> => {
  const { seasonId, playerId, weekNumber, year } = params;

  const responses = await db
    .selectFrom('dayResponses')
    .select(['id', 'day', 'status'])
    .where('seasonId', '=', seasonId)
    .where('playerId', '=', playerId)
    .where('weekNumber', '=', weekNumber)
    .where('year', '=', year)
    .execute();

  if (responses.length === 0) {
    return {};
  }

  const responseIds = responses.map((r) => r.id);
  const slots = await db
    .selectFrom('timeSlots')
    .select(['dayResponseId', 'timeSlot'])
    .where('dayResponseId', 'in', responseIds)
    .execute();

  const slotsByResponseId = new Map<number, string[]>();
  for (const slot of slots) {
    const existing = slotsByResponseId.get(slot.dayResponseId) ?? [];
    existing.push(slot.timeSlot);
    slotsByResponseId.set(slot.dayResponseId, existing);
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
    .selectFrom('dayResponses')
    .innerJoin('players', 'players.telegramId', 'dayResponses.playerId')
    .select([
      'dayResponses.id',
      'dayResponses.playerId',
      'dayResponses.day',
      'dayResponses.status',
      'players.displayName',
      'players.username',
    ])
    .where('dayResponses.seasonId', '=', seasonId)
    .where('dayResponses.weekNumber', '=', weekNumber)
    .where('dayResponses.year', '=', year)
    .execute();

  if (responses.length === 0) {
    return [];
  }

  const responseIds = responses.map((r) => r.id);
  const slots = await db
    .selectFrom('timeSlots')
    .select(['dayResponseId', 'timeSlot'])
    .where('dayResponseId', 'in', responseIds)
    .execute();

  const slotsByResponseId = new Map<number, string[]>();
  for (const slot of slots) {
    const existing = slotsByResponseId.get(slot.dayResponseId) ?? [];
    existing.push(slot.timeSlot);
    slotsByResponseId.set(slot.dayResponseId, existing);
  }

  const playerMap = new Map<number, PlayerWeekAvailability>();
  for (const response of responses) {
    let player = playerMap.get(response.playerId);
    if (!player) {
      player = {
        playerId: response.playerId,
        displayName: response.displayName,
        username: response.username,
        responses: {},
      };
      playerMap.set(response.playerId, player);
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
    .selectFrom('dayResponses')
    .select(db.fn.count('id').as('count'))
    .where('seasonId', '=', seasonId)
    .where('playerId', '=', playerId)
    .where('weekNumber', '=', weekNumber)
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
    .deleteFrom('dayResponses')
    .where('seasonId', '=', seasonId)
    .where('playerId', '=', playerId)
    .where('weekNumber', '=', weekNumber)
    .where('year', '=', year)
    .where('day', '=', day)
    .executeTakeFirst();

  return result.numDeletedRows > 0n;
};
