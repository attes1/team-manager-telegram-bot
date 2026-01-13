import { describe, expect, test } from 'vitest';
import { en } from '@/i18n/en';
import {
  buildLineupMessage,
  buildMatchScheduledMessage,
  buildNextMatchMessage,
  type MatchDisplayData,
  type NextMatchResult,
} from '@/services/match';
import type { Player } from '@/types/db';

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
