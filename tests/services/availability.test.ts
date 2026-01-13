import { createTestDb } from '@tests/helpers';
import type { Kysely } from 'kysely';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  clearDayAvailability,
  getDayAvailability,
  getPlayerWeekAvailability,
  getWeekAvailability,
  hasRespondedForWeek,
  setDayAvailability,
} from '@/services/availability';
import { addPlayerToRoster } from '@/services/roster';
import type { DB } from '@/types/db';

describe('availability service', () => {
  let db: Kysely<DB>;
  let seasonId: number;
  const playerId = 123456;
  const weekNumber = 5;
  const year = 2025;

  beforeEach(async () => {
    db = await createTestDb();
    const season = await db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();
    seasonId = season.id;

    await addPlayerToRoster(db, {
      seasonId,
      telegramId: playerId,
      displayName: 'Test Player',
      username: 'testplayer',
    });
  });

  afterEach(async () => {
    await db.destroy();
  });

  describe('setDayAvailability', () => {
    test('creates new day response with status and time slots', async () => {
      const result = await setDayAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
        day: 'mon',
        status: 'available',
        timeSlots: ['19', '20'],
      });

      expect(result.day).toBe('mon');
      expect(result.status).toBe('available');
      expect(result.timeSlots).toEqual(['19', '20']);
    });

    test('updates existing day response', async () => {
      await setDayAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
        day: 'mon',
        status: 'available',
        timeSlots: ['19'],
      });

      const result = await setDayAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
        day: 'mon',
        status: 'practice_only',
        timeSlots: ['20', '21'],
      });

      expect(result.status).toBe('practice_only');
      expect(result.timeSlots).toEqual(['20', '21']);

      const responses = await db
        .selectFrom('day_responses')
        .selectAll()
        .where('player_id', '=', playerId)
        .where('day', '=', 'mon')
        .execute();
      expect(responses).toHaveLength(1);
    });

    test('allows setting unavailable with empty time slots', async () => {
      const result = await setDayAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
        day: 'tue',
        status: 'unavailable',
        timeSlots: [],
      });

      expect(result.status).toBe('unavailable');
      expect(result.timeSlots).toEqual([]);
    });

    test('replaces time slots when updating', async () => {
      await setDayAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
        day: 'wed',
        status: 'available',
        timeSlots: ['19', '20', '21'],
      });

      await setDayAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
        day: 'wed',
        status: 'available',
        timeSlots: ['20'],
      });

      const slots = await db
        .selectFrom('time_slots')
        .innerJoin('day_responses', 'day_responses.id', 'time_slots.day_response_id')
        .select('time_slots.time_slot')
        .where('day_responses.player_id', '=', playerId)
        .where('day_responses.day', '=', 'wed')
        .execute();

      expect(slots).toHaveLength(1);
      expect(slots[0].time_slot).toBe('20');
    });
  });

  describe('getDayAvailability', () => {
    test('returns availability for a specific day', async () => {
      await setDayAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
        day: 'mon',
        status: 'available',
        timeSlots: ['19', '20'],
      });

      const result = await getDayAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
        day: 'mon',
      });

      expect(result).toBeDefined();
      expect(result?.status).toBe('available');
      expect(result?.timeSlots).toEqual(['19', '20']);
    });

    test('returns undefined if no response for day', async () => {
      const result = await getDayAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
        day: 'fri',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('getPlayerWeekAvailability', () => {
    test('returns empty object when no responses', async () => {
      const result = await getPlayerWeekAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
      });

      expect(result).toEqual({});
    });

    test('returns all days with responses', async () => {
      await setDayAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
        day: 'mon',
        status: 'available',
        timeSlots: ['19'],
      });
      await setDayAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
        day: 'wed',
        status: 'practice_only',
        timeSlots: ['20', '21'],
      });

      const result = await getPlayerWeekAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
      });

      expect(Object.keys(result)).toHaveLength(2);
      expect(result.mon?.status).toBe('available');
      expect(result.mon?.timeSlots).toEqual(['19']);
      expect(result.wed?.status).toBe('practice_only');
      expect(result.wed?.timeSlots).toEqual(['20', '21']);
    });

    test('does not include responses from different weeks', async () => {
      await setDayAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
        day: 'mon',
        status: 'available',
        timeSlots: ['19'],
      });
      await setDayAvailability(db, {
        seasonId,
        playerId,
        weekNumber: weekNumber + 1,
        year,
        day: 'mon',
        status: 'practice_only',
        timeSlots: ['20'],
      });

      const result = await getPlayerWeekAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
      });

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.mon?.status).toBe('available');
    });
  });

  describe('getWeekAvailability', () => {
    test('returns empty array when no responses', async () => {
      const result = await getWeekAvailability(db, { seasonId, weekNumber, year });

      expect(result).toEqual([]);
    });

    test('returns all players availability for the week', async () => {
      const player2Id = 789012;
      await addPlayerToRoster(db, {
        seasonId,
        telegramId: player2Id,
        displayName: 'Player 2',
      });

      await setDayAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
        day: 'mon',
        status: 'available',
        timeSlots: ['19', '20'],
      });
      await setDayAvailability(db, {
        seasonId,
        playerId: player2Id,
        weekNumber,
        year,
        day: 'mon',
        status: 'if_needed',
        timeSlots: ['20'],
      });

      const result = await getWeekAvailability(db, { seasonId, weekNumber, year });

      expect(result).toHaveLength(2);
      const player1Entry = result.find((r) => r.playerId === playerId);
      const player2Entry = result.find((r) => r.playerId === player2Id);

      expect(player1Entry?.responses.mon?.status).toBe('available');
      expect(player1Entry?.responses.mon?.timeSlots).toEqual(['19', '20']);
      expect(player2Entry?.responses.mon?.status).toBe('if_needed');
      expect(player2Entry?.responses.mon?.timeSlots).toEqual(['20']);
    });

    test('includes player info in results', async () => {
      await setDayAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
        day: 'tue',
        status: 'available',
        timeSlots: ['19'],
      });

      const result = await getWeekAvailability(db, { seasonId, weekNumber, year });

      expect(result).toHaveLength(1);
      expect(result[0].playerId).toBe(playerId);
      expect(result[0].displayName).toBe('Test Player');
    });
  });

  describe('hasRespondedForWeek', () => {
    test('returns false when no responses', async () => {
      const result = await hasRespondedForWeek(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
      });

      expect(result).toBe(false);
    });

    test('returns true when player has at least one response', async () => {
      await setDayAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
        day: 'mon',
        status: 'unavailable',
        timeSlots: [],
      });

      const result = await hasRespondedForWeek(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
      });

      expect(result).toBe(true);
    });

    test('returns false for different week', async () => {
      await setDayAvailability(db, {
        seasonId,
        playerId,
        weekNumber: weekNumber + 1,
        year,
        day: 'mon',
        status: 'available',
        timeSlots: ['19'],
      });

      const result = await hasRespondedForWeek(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
      });

      expect(result).toBe(false);
    });
  });

  describe('clearDayAvailability', () => {
    test('removes day response and time slots', async () => {
      await setDayAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
        day: 'mon',
        status: 'available',
        timeSlots: ['19', '20'],
      });

      const removed = await clearDayAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
        day: 'mon',
      });

      expect(removed).toBe(true);

      const response = await getDayAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
        day: 'mon',
      });
      expect(response).toBeUndefined();
    });

    test('returns false if no response to clear', async () => {
      const removed = await clearDayAvailability(db, {
        seasonId,
        playerId,
        weekNumber,
        year,
        day: 'fri',
      });

      expect(removed).toBe(false);
    });
  });
});
