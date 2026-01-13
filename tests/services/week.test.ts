import { createTestDb } from '@tests/helpers';
import type { Kysely } from 'kysely';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { startSeason } from '@/services/season';
import { getWeek, setWeekType } from '@/services/week';
import type { DB } from '@/types/db';

describe('week service', () => {
  let db: Kysely<DB>;
  let seasonId: number;

  beforeEach(async () => {
    db = await createTestDb();
    const season = await startSeason(db, 'Test Season');
    seasonId = season.id;
  });

  afterEach(async () => {
    await db.destroy();
  });

  describe('setWeekType', () => {
    test('creates week with practice type', async () => {
      const week = await setWeekType(db, seasonId, 5, 2025, 'practice');

      expect(week.seasonId).toBe(seasonId);
      expect(week.weekNumber).toBe(5);
      expect(week.year).toBe(2025);
      expect(week.type).toBe('practice');
    });

    test('creates week with match type', async () => {
      const week = await setWeekType(db, seasonId, 5, 2025, 'match');

      expect(week.type).toBe('match');
    });

    test('updates existing week type', async () => {
      await setWeekType(db, seasonId, 5, 2025, 'practice');
      const week = await setWeekType(db, seasonId, 5, 2025, 'match');

      expect(week.type).toBe('match');

      const weeks = await db
        .selectFrom('weeks')
        .selectAll()
        .where('season_id', '=', seasonId)
        .where('week_number', '=', 5)
        .where('year', '=', 2025)
        .execute();

      expect(weeks).toHaveLength(1);
    });

    test('different weeks are stored separately', async () => {
      await setWeekType(db, seasonId, 5, 2025, 'practice');
      await setWeekType(db, seasonId, 6, 2025, 'match');

      const week5 = await getWeek(db, seasonId, 5, 2025);
      const week6 = await getWeek(db, seasonId, 6, 2025);

      expect(week5?.type).toBe('practice');
      expect(week6?.type).toBe('match');
    });
  });

  describe('getWeek', () => {
    test('returns undefined for non-existent week', async () => {
      const week = await getWeek(db, seasonId, 99, 2025);
      expect(week).toBeUndefined();
    });

    test('returns week with all fields', async () => {
      await setWeekType(db, seasonId, 5, 2025, 'practice');

      const week = await getWeek(db, seasonId, 5, 2025);
      expect(week).toMatchObject({
        seasonId,
        weekNumber: 5,
        year: 2025,
        type: 'practice',
        matchDay: null,
        matchTime: null,
      });
    });

    test('returns default match type when week not configured', async () => {
      const week = await getWeek(db, seasonId, 10, 2025);
      expect(week).toBeUndefined();
    });
  });
});
