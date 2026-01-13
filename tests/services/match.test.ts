import { createTestDb, testEnv } from '@tests/helpers';
import type { Kysely } from 'kysely';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  addPlayerToLineup,
  clearLineup,
  getLineup,
  getMatchInfo,
  removePlayerFromLineup,
  setLineup,
  setMatchTime,
} from '@/services/match';
import { addPlayerToRoster } from '@/services/roster';
import { startSeason } from '@/services/season';
import type { DB } from '@/types/db';

vi.mock('@/env', () => ({ env: testEnv }));

describe('match service', () => {
  let db: Kysely<DB>;
  let seasonId: number;
  const weekNumber = 5;
  const year = 2025;

  beforeEach(async () => {
    db = await createTestDb();
    const season = await startSeason(db, 'Test Season');
    seasonId = season.id;
  });

  afterEach(async () => {
    await db.destroy();
  });

  describe('setMatchTime', () => {
    test('sets match day and time for a week', async () => {
      const result = await setMatchTime(db, {
        seasonId,
        weekNumber,
        year,
        matchDay: 'sun',
        matchTime: '20:00',
      });

      expect(result.matchDay).toBe('sun');
      expect(result.matchTime).toBe('20:00');
    });

    test('updates existing match time', async () => {
      await setMatchTime(db, {
        seasonId,
        weekNumber,
        year,
        matchDay: 'sun',
        matchTime: '20:00',
      });

      const result = await setMatchTime(db, {
        seasonId,
        weekNumber,
        year,
        matchDay: 'sat',
        matchTime: '19:00',
      });

      expect(result.matchDay).toBe('sat');
      expect(result.matchTime).toBe('19:00');

      const weeks = await db
        .selectFrom('weeks')
        .selectAll()
        .where('seasonId', '=', seasonId)
        .where('weekNumber', '=', weekNumber)
        .execute();
      expect(weeks).toHaveLength(1);
    });

    test('preserves week type when setting match time', async () => {
      await db
        .insertInto('weeks')
        .values({ seasonId, weekNumber, year, type: 'practice' })
        .execute();

      const result = await setMatchTime(db, {
        seasonId,
        weekNumber,
        year,
        matchDay: 'wed',
        matchTime: '21:00',
      });

      expect(result.type).toBe('practice');
      expect(result.matchDay).toBe('wed');
    });
  });

  describe('getMatchInfo', () => {
    test('returns undefined when no match info exists', async () => {
      const result = await getMatchInfo(db, { seasonId, weekNumber, year });
      expect(result).toBeUndefined();
    });

    test('returns match info when set', async () => {
      await setMatchTime(db, {
        seasonId,
        weekNumber,
        year,
        matchDay: 'sun',
        matchTime: '20:00',
      });

      const result = await getMatchInfo(db, { seasonId, weekNumber, year });

      expect(result).toBeDefined();
      expect(result?.matchDay).toBe('sun');
      expect(result?.matchTime).toBe('20:00');
    });

    test('returns null matchDay/matchTime when week exists but match not scheduled', async () => {
      await db.insertInto('weeks').values({ seasonId, weekNumber, year, type: 'match' }).execute();

      const result = await getMatchInfo(db, { seasonId, weekNumber, year });

      expect(result).toBeDefined();
      expect(result?.matchDay).toBeNull();
      expect(result?.matchTime).toBeNull();
    });
  });

  describe('lineup management', () => {
    const player1Id = 111;
    const player2Id = 222;
    const player3Id = 333;

    beforeEach(async () => {
      await addPlayerToRoster(db, {
        seasonId,
        telegramId: player1Id,
        displayName: 'Player 1',
        username: 'player1',
      });
      await addPlayerToRoster(db, {
        seasonId,
        telegramId: player2Id,
        displayName: 'Player 2',
        username: 'player2',
      });
      await addPlayerToRoster(db, {
        seasonId,
        telegramId: player3Id,
        displayName: 'Player 3',
      });
    });

    describe('addPlayerToLineup', () => {
      test('adds a player to the lineup', async () => {
        const added = await addPlayerToLineup(db, {
          seasonId,
          weekNumber,
          year,
          playerId: player1Id,
        });

        expect(added).toBe(true);

        const lineup = await getLineup(db, { seasonId, weekNumber, year });
        expect(lineup).toHaveLength(1);
        expect(lineup[0].telegramId).toBe(player1Id);
      });

      test('returns false if player already in lineup', async () => {
        await addPlayerToLineup(db, { seasonId, weekNumber, year, playerId: player1Id });
        const added = await addPlayerToLineup(db, {
          seasonId,
          weekNumber,
          year,
          playerId: player1Id,
        });

        expect(added).toBe(false);
      });
    });

    describe('removePlayerFromLineup', () => {
      test('removes a player from the lineup', async () => {
        await addPlayerToLineup(db, { seasonId, weekNumber, year, playerId: player1Id });
        await addPlayerToLineup(db, { seasonId, weekNumber, year, playerId: player2Id });

        const removed = await removePlayerFromLineup(db, {
          seasonId,
          weekNumber,
          year,
          playerId: player1Id,
        });

        expect(removed).toBe(true);

        const lineup = await getLineup(db, { seasonId, weekNumber, year });
        expect(lineup).toHaveLength(1);
        expect(lineup[0].telegramId).toBe(player2Id);
      });

      test('returns false if player not in lineup', async () => {
        const removed = await removePlayerFromLineup(db, {
          seasonId,
          weekNumber,
          year,
          playerId: player1Id,
        });

        expect(removed).toBe(false);
      });
    });

    describe('setLineup', () => {
      test('sets lineup with multiple players', async () => {
        await setLineup(db, {
          seasonId,
          weekNumber,
          year,
          playerIds: [player1Id, player2Id, player3Id],
        });

        const lineup = await getLineup(db, { seasonId, weekNumber, year });
        expect(lineup).toHaveLength(3);
        expect(lineup.map((p) => p.telegramId).sort()).toEqual(
          [player1Id, player2Id, player3Id].sort(),
        );
      });

      test('replaces existing lineup', async () => {
        await setLineup(db, {
          seasonId,
          weekNumber,
          year,
          playerIds: [player1Id, player2Id],
        });

        await setLineup(db, {
          seasonId,
          weekNumber,
          year,
          playerIds: [player3Id],
        });

        const lineup = await getLineup(db, { seasonId, weekNumber, year });
        expect(lineup).toHaveLength(1);
        expect(lineup[0].telegramId).toBe(player3Id);
      });

      test('can set empty lineup', async () => {
        await setLineup(db, {
          seasonId,
          weekNumber,
          year,
          playerIds: [player1Id],
        });

        await setLineup(db, {
          seasonId,
          weekNumber,
          year,
          playerIds: [],
        });

        const lineup = await getLineup(db, { seasonId, weekNumber, year });
        expect(lineup).toHaveLength(0);
      });
    });

    describe('getLineup', () => {
      test('returns empty array when no lineup', async () => {
        const lineup = await getLineup(db, { seasonId, weekNumber, year });
        expect(lineup).toEqual([]);
      });

      test('returns player info with lineup', async () => {
        await addPlayerToLineup(db, { seasonId, weekNumber, year, playerId: player1Id });

        const lineup = await getLineup(db, { seasonId, weekNumber, year });

        expect(lineup).toHaveLength(1);
        expect(lineup[0]).toMatchObject({
          telegramId: player1Id,
          displayName: 'Player 1',
          username: 'player1',
        });
      });

      test('returns lineup for correct week only', async () => {
        await addPlayerToLineup(db, { seasonId, weekNumber, year, playerId: player1Id });
        await addPlayerToLineup(db, {
          seasonId,
          weekNumber: weekNumber + 1,
          year,
          playerId: player2Id,
        });

        const lineup = await getLineup(db, { seasonId, weekNumber, year });

        expect(lineup).toHaveLength(1);
        expect(lineup[0].telegramId).toBe(player1Id);
      });
    });

    describe('clearLineup', () => {
      test('removes all players from lineup', async () => {
        await setLineup(db, {
          seasonId,
          weekNumber,
          year,
          playerIds: [player1Id, player2Id, player3Id],
        });

        const cleared = await clearLineup(db, { seasonId, weekNumber, year });

        expect(cleared).toBe(true);

        const lineup = await getLineup(db, { seasonId, weekNumber, year });
        expect(lineup).toHaveLength(0);
      });

      test('returns false when no lineup to clear', async () => {
        const cleared = await clearLineup(db, { seasonId, weekNumber, year });
        expect(cleared).toBe(false);
      });
    });
  });
});
