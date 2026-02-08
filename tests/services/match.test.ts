import { createTestDb } from '@tests/helpers';
import type { Kysely } from 'kysely';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { en } from '@/i18n/en';
import type { Day } from '@/lib/schemas';
import {
  addPlayerToLineup,
  buildLineupMessage,
  buildMatchScheduledMessage,
  buildNextMatchMessage,
  clearLineup,
  clearOpponent,
  getLineup,
  getMatchInfo,
  getMatchTargetWeek,
  type MatchDisplayData,
  type NextMatchResult,
  removePlayerFromLineup,
  setLineup,
  setMatchTime,
  setOpponent,
} from '@/services/match';
import { addPlayerToRoster } from '@/services/roster';
import { startSeason } from '@/services/season';
import { setWeekType } from '@/services/week';
import type { DB, Player } from '@/types/db';

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

  describe('setOpponent', () => {
    test('sets opponent name only', async () => {
      const result = await setOpponent(db, {
        seasonId,
        weekNumber,
        year,
        opponentName: 'EC Myyrylit',
      });

      expect(result.opponentName).toBe('EC Myyrylit');
      expect(result.opponentUrl).toBeNull();
    });

    test('sets opponent name and url', async () => {
      const result = await setOpponent(db, {
        seasonId,
        weekNumber,
        year,
        opponentName: 'EC Myyrylit',
        opponentUrl: 'https://example.com/ec-myyrylit',
      });

      expect(result.opponentName).toBe('EC Myyrylit');
      expect(result.opponentUrl).toBe('https://example.com/ec-myyrylit');
    });

    test('updates existing opponent info', async () => {
      await setOpponent(db, {
        seasonId,
        weekNumber,
        year,
        opponentName: 'EC Myyrylit',
        opponentUrl: 'https://example.com/ec-myyrylit',
      });

      const result = await setOpponent(db, {
        seasonId,
        weekNumber,
        year,
        opponentName: 'Vihun joukkue',
        opponentUrl: 'https://example.com/vihun-joukkue',
      });

      expect(result.opponentName).toBe('Vihun joukkue');
      expect(result.opponentUrl).toBe('https://example.com/vihun-joukkue');

      const weeks = await db
        .selectFrom('weeks')
        .selectAll()
        .where('seasonId', '=', seasonId)
        .where('weekNumber', '=', weekNumber)
        .execute();
      expect(weeks).toHaveLength(1);
    });

    test('preserves week type and match time when setting opponent', async () => {
      await setMatchTime(db, {
        seasonId,
        weekNumber,
        year,
        matchDay: 'sun',
        matchTime: '20:00',
      });

      const result = await setOpponent(db, {
        seasonId,
        weekNumber,
        year,
        opponentName: 'EC Myyrylit',
      });

      expect(result.opponentName).toBe('EC Myyrylit');
      expect(result.matchDay).toBe('sun');
      expect(result.matchTime).toBe('20:00');
    });
  });

  describe('clearOpponent', () => {
    test('clears opponent info from week', async () => {
      await setOpponent(db, {
        seasonId,
        weekNumber,
        year,
        opponentName: 'EC Myyrylit',
        opponentUrl: 'https://example.com/ec-myyrylit',
      });

      const cleared = await clearOpponent(db, { seasonId, weekNumber, year });

      expect(cleared).toBe(true);

      const matchInfo = await getMatchInfo(db, { seasonId, weekNumber, year });
      expect(matchInfo?.opponentName).toBeNull();
      expect(matchInfo?.opponentUrl).toBeNull();
    });

    test('returns false when week does not exist', async () => {
      const cleared = await clearOpponent(db, { seasonId, weekNumber, year });
      expect(cleared).toBe(false);
    });

    test('preserves match time when clearing opponent', async () => {
      await setMatchTime(db, {
        seasonId,
        weekNumber,
        year,
        matchDay: 'sun',
        matchTime: '20:00',
      });
      await setOpponent(db, {
        seasonId,
        weekNumber,
        year,
        opponentName: 'EC Myyrylit',
      });

      await clearOpponent(db, { seasonId, weekNumber, year });

      const matchInfo = await getMatchInfo(db, { seasonId, weekNumber, year });
      expect(matchInfo?.matchDay).toBe('sun');
      expect(matchInfo?.matchTime).toBe('20:00');
      expect(matchInfo?.opponentName).toBeNull();
    });
  });

  describe('getMatchInfo with opponent', () => {
    test('returns opponent info when set', async () => {
      await setOpponent(db, {
        seasonId,
        weekNumber,
        year,
        opponentName: 'EC Myyrylit',
        opponentUrl: 'https://example.com/ec-myyrylit',
      });

      const result = await getMatchInfo(db, { seasonId, weekNumber, year });

      expect(result?.opponentName).toBe('EC Myyrylit');
      expect(result?.opponentUrl).toBe('https://example.com/ec-myyrylit');
    });

    test('returns null opponent info when not set', async () => {
      await setMatchTime(db, {
        seasonId,
        weekNumber,
        year,
        matchDay: 'sun',
        matchTime: '20:00',
      });

      const result = await getMatchInfo(db, { seasonId, weekNumber, year });

      expect(result?.opponentName).toBeNull();
      expect(result?.opponentUrl).toBeNull();
    });
  });
});

describe('match message formatting', () => {
  describe('buildNextMatchMessage', () => {
    const createMatchData = (overrides: Partial<MatchDisplayData> = {}): MatchDisplayData => ({
      week: 5,
      year: 2025,
      dateRange: '27.1. - 2.2.',
      matchDay: 'Sunday',
      matchTime: '20:00',
      isDefault: false,
      lineup: [],
      lineupSize: 5,
      opponentName: null,
      opponentUrl: null,
      ...overrides,
    });

    test('builds message for upcoming match with scheduled time and lineup', () => {
      const result: NextMatchResult = {
        type: 'upcoming',
        data: createMatchData({
          lineup: [
            { telegramId: 1, displayName: 'Player 1', username: 'p1', createdAt: '' },
            { telegramId: 2, displayName: 'Player 2', username: null, createdAt: '' },
          ],
          lineupSize: 2,
        }),
      };

      const message = buildNextMatchMessage(en, result);

      expect(message).toContain('Week 5 (27.1. - 2.2.)');
      expect(message).toContain('Sunday at 20:00');
      expect(message).toContain('Lineup');
      expect(message).toContain('p1');
      expect(message).toContain('Player 2');
      expect(message).not.toContain('Default');
    });

    test('builds message with default time', () => {
      const result: NextMatchResult = {
        type: 'upcoming',
        data: createMatchData({ isDefault: true }),
      };

      const message = buildNextMatchMessage(en, result);

      expect(message).toContain('Default time');
      expect(message).toContain('Lineup not yet set');
    });

    test('builds message without scheduled time', () => {
      const result: NextMatchResult = {
        type: 'upcoming',
        data: createMatchData({ matchDay: null, matchTime: null }),
      };

      const message = buildNextMatchMessage(en, result);

      expect(message).toContain('Time not yet scheduled');
    });

    test('shows warning emoji when lineup is partial', () => {
      const result: NextMatchResult = {
        type: 'upcoming',
        data: createMatchData({
          lineup: [{ telegramId: 1, displayName: 'Player 1', username: 'p1', createdAt: '' }],
          lineupSize: 5,
        }),
      };

      const message = buildNextMatchMessage(en, result);

      expect(message).toContain('Lineup');
      expect(message).toContain('⚠️');
    });

    test('no warning emoji when lineup is full', () => {
      const result: NextMatchResult = {
        type: 'upcoming',
        data: createMatchData({
          lineup: [
            { telegramId: 1, displayName: 'Player 1', username: 'p1', createdAt: '' },
            { telegramId: 2, displayName: 'Player 2', username: null, createdAt: '' },
          ],
          lineupSize: 2,
        }),
      };

      const message = buildNextMatchMessage(en, result);

      expect(message).toContain('Lineup');
      expect(message).not.toContain('⚠️');
    });

    test('builds message with opponent name only', () => {
      const result: NextMatchResult = {
        type: 'upcoming',
        data: createMatchData({ opponentName: 'EC Myyrylit' }),
      };

      const message = buildNextMatchMessage(en, result);

      expect(message).toContain('Opponent: EC Myyrylit');
      expect(message).not.toContain('[EC Myyrylit]');
    });

    test('builds message with opponent name and url', () => {
      const result: NextMatchResult = {
        type: 'upcoming',
        data: createMatchData({
          opponentName: 'EC Myyrylit',
          opponentUrl: 'https://example.com/ec-myyrylit',
        }),
      };

      const message = buildNextMatchMessage(en, result);

      expect(message).toContain('[EC Myyrylit](https://example.com/ec-myyrylit)');
    });

    test('builds message for no match this week with next match', () => {
      const result: NextMatchResult = {
        type: 'no_match_this_week',
        nextMatch: createMatchData({ week: 6, dateRange: '3.2. - 9.2.' }),
      };

      const message = buildNextMatchMessage(en, result);

      expect(message).toContain('No match this week');
      expect(message).toContain('Week 6 (3.2. - 9.2.)');
    });

    test('builds message for no match this week with no upcoming match', () => {
      const result: NextMatchResult = {
        type: 'no_match_this_week',
        nextMatch: null,
      };

      const message = buildNextMatchMessage(en, result);

      expect(message).toContain('No match this week');
      expect(message).toContain('No info about next match');
    });

    test('builds message for already played match with next match', () => {
      const result: NextMatchResult = {
        type: 'already_played',
        nextMatch: createMatchData({ week: 6, dateRange: '3.2. - 9.2.' }),
      };

      const message = buildNextMatchMessage(en, result);

      expect(message).toContain('already played');
      expect(message).toContain('Week 6 (3.2. - 9.2.)');
    });

    test('builds message for already played match with no upcoming match', () => {
      const result: NextMatchResult = {
        type: 'already_played',
        nextMatch: null,
      };

      const message = buildNextMatchMessage(en, result);

      expect(message).toContain('already played');
      expect(message).toContain('No info about next match');
    });
  });

  describe('buildLineupMessage', () => {
    test('builds lineup message', () => {
      const lineup: Player[] = [
        { telegramId: 1, displayName: 'Player 1', username: 'p1', createdAt: '' },
        { telegramId: 2, displayName: 'Player 2', username: null, createdAt: '' },
      ];

      const message = buildLineupMessage(en, 5, '27.1. - 2.2.', lineup);

      expect(message).toContain('Lineup set (2 players)');
      expect(message).toContain('Week 5');
      expect(message).toContain('p1');
      expect(message).toContain('Player 2');
    });

    test('builds lineup message with single player', () => {
      const lineup: Player[] = [
        { telegramId: 1, displayName: 'Player 1', username: null, createdAt: '' },
      ];

      const message = buildLineupMessage(en, 5, '27.1. - 2.2.', lineup);

      expect(message).toContain('Lineup set (1 players)');
      expect(message).toContain('Week 5');
      expect(message).toContain('Player 1');
    });
  });

  describe('buildMatchScheduledMessage', () => {
    test('builds match scheduled message', () => {
      const message = buildMatchScheduledMessage(en, 'Sunday', '20:00');

      expect(message).toContain('Match scheduled');
      expect(message).toContain('Sunday at 20:00');
    });
  });
});

describe('getMatchTargetWeek', () => {
  let db: Kysely<DB>;
  let seasonId: number;

  const config = {
    seasonId: 1,
    language: 'en' as const,
    pollDay: 'sun' as const,
    pollTime: '10:00',
    pollDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as Day[],
    pollTimes: '19,20,21',
    weekChangeDay: 'thu' as const,
    weekChangeTime: '10:00',
    reminderDay: 'wed' as const,
    reminderTime: '18:00',
    remindersMode: 'quiet' as const,
    matchDay: 'sun' as const,
    matchTime: '20:00',
    lineupSize: 5,
    matchDayReminderMode: 'quiet' as const,
    matchDayReminderTime: '18:00',
    publicAnnouncements: 'on' as const,
    publicCommandsMode: 'all' as const,
    menuExpirationHours: 24,
    menuCleanupTime: '04:00',
  };

  const schedulingWeek = { week: 3, year: 2025 };

  beforeEach(async () => {
    db = await createTestDb();
    const season = await startSeason(db, 'Test Season');
    seasonId = season.id;
  });

  afterEach(async () => {
    await db.destroy();
  });

  test('returns current week when match is in the future', async () => {
    // Pinned time: Wed 2025-01-08 09:00 (week 2). Default match: Sun 20:00 → future
    const result = await getMatchTargetWeek(db, seasonId, config, schedulingWeek);
    expect(result).toEqual({ week: 2, year: 2025 });
  });

  test('returns schedulingWeek when match is in the past', async () => {
    // Set time to after Sunday 20:00 of week 2
    vi.setSystemTime(new Date('2025-01-12T21:00:00'));

    const result = await getMatchTargetWeek(db, seasonId, config, schedulingWeek);
    expect(result).toEqual(schedulingWeek);
  });

  test('returns schedulingWeek when current week is practice', async () => {
    await setWeekType(db, seasonId, 2, 2025, 'practice');

    const result = await getMatchTargetWeek(db, seasonId, config, schedulingWeek);
    expect(result).toEqual(schedulingWeek);
  });

  test('uses custom match day/time from weeks table', async () => {
    // Set a custom match time on Wednesday 10:00 for week 2
    await setMatchTime(db, {
      seasonId,
      weekNumber: 2,
      year: 2025,
      matchDay: 'wed',
      matchTime: '10:00',
    });

    // Pinned time: Wed 09:00, match is Wed 10:00 → still in future
    const result = await getMatchTargetWeek(db, seasonId, config, schedulingWeek);
    expect(result).toEqual({ week: 2, year: 2025 });
  });

  test('returns schedulingWeek when custom match time has passed', async () => {
    // Set a custom match time on Monday 10:00 for week 2
    await setMatchTime(db, {
      seasonId,
      weekNumber: 2,
      year: 2025,
      matchDay: 'mon',
      matchTime: '10:00',
    });

    // Pinned time: Wed 09:00, match was Mon 10:00 → in the past
    const result = await getMatchTargetWeek(db, seasonId, config, schedulingWeek);
    expect(result).toEqual(schedulingWeek);
  });
});
