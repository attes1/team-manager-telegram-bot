import { describe, expect, test } from 'vitest';
import { en } from '@/i18n/en';
import {
  buildLineupAnnouncement,
  buildMatchAnnouncement,
  buildMatchScheduledAnnouncement,
  type MatchAnnouncementData,
} from '@/services/announcements';
import type { Player } from '@/types/db';

describe('announcements service', () => {
  describe('buildMatchAnnouncement', () => {
    test('builds announcement with scheduled match and lineup', () => {
      const data: MatchAnnouncementData = {
        week: 5,
        dateRange: '27.1. - 2.2.',
        matchDay: 'Sunday',
        matchTime: '20:00',
        isDefault: false,
        lineup: [
          { telegramId: 1, displayName: 'Player 1', username: 'p1', createdAt: '' },
          { telegramId: 2, displayName: 'Player 2', username: null, createdAt: '' },
        ],
        lineupSize: 2,
        opponentName: null,
        opponentUrl: null,
      };

      const message = buildMatchAnnouncement(en, data);

      expect(message).toContain('Week 5 (27.1. - 2.2.)');
      expect(message).toContain('Sunday at 20:00');
      expect(message).toContain('Lineup');
      // Player 1 has username 'p1' (no @ to avoid ping), Player 2 has no username
      expect(message).toContain('p1');
      expect(message).toContain('Player 2');
      expect(message).not.toContain('Default');
    });

    test('builds announcement with default time', () => {
      const data: MatchAnnouncementData = {
        week: 5,
        dateRange: '27.1. - 2.2.',
        matchDay: 'Sunday',
        matchTime: '20:00',
        isDefault: true,
        lineup: [],
        lineupSize: 5,
        opponentName: null,
        opponentUrl: null,
      };

      const message = buildMatchAnnouncement(en, data);

      expect(message).toContain('Default time');
      expect(message).toContain('Lineup not yet set');
    });

    test('builds announcement without scheduled time', () => {
      const data: MatchAnnouncementData = {
        week: 5,
        dateRange: '27.1. - 2.2.',
        matchDay: null,
        matchTime: null,
        isDefault: false,
        lineup: [],
        lineupSize: 5,
        opponentName: null,
        opponentUrl: null,
      };

      const message = buildMatchAnnouncement(en, data);

      expect(message).toContain('Time not yet scheduled');
    });

    test('shows warning emoji when lineup is partial', () => {
      const data: MatchAnnouncementData = {
        week: 5,
        dateRange: '27.1. - 2.2.',
        matchDay: 'Sunday',
        matchTime: '20:00',
        isDefault: false,
        lineup: [{ telegramId: 1, displayName: 'Player 1', username: 'p1', createdAt: '' }],
        lineupSize: 5,
        opponentName: null,
        opponentUrl: null,
      };

      const message = buildMatchAnnouncement(en, data);

      expect(message).toContain('Lineup');
      expect(message).toContain('⚠️');
    });

    test('no warning emoji when lineup is full', () => {
      const data: MatchAnnouncementData = {
        week: 5,
        dateRange: '27.1. - 2.2.',
        matchDay: 'Sunday',
        matchTime: '20:00',
        isDefault: false,
        lineup: [
          { telegramId: 1, displayName: 'Player 1', username: 'p1', createdAt: '' },
          { telegramId: 2, displayName: 'Player 2', username: null, createdAt: '' },
        ],
        lineupSize: 2,
        opponentName: null,
        opponentUrl: null,
      };

      const message = buildMatchAnnouncement(en, data);

      expect(message).toContain('Lineup');
      expect(message).not.toContain('⚠️');
    });

    test('builds announcement with opponent name only', () => {
      const data: MatchAnnouncementData = {
        week: 5,
        dateRange: '27.1. - 2.2.',
        matchDay: 'Sunday',
        matchTime: '20:00',
        isDefault: false,
        lineup: [],
        lineupSize: 5,
        opponentName: 'EC Myyrylit',
        opponentUrl: null,
      };

      const message = buildMatchAnnouncement(en, data);

      expect(message).toContain('Opponent: EC Myyrylit');
      expect(message).not.toContain('[EC Myyrylit]');
    });

    test('builds announcement with opponent name and url', () => {
      const data: MatchAnnouncementData = {
        week: 5,
        dateRange: '27.1. - 2.2.',
        matchDay: 'Sunday',
        matchTime: '20:00',
        isDefault: false,
        lineup: [],
        lineupSize: 5,
        opponentName: 'EC Myyrylit',
        opponentUrl: 'https://example.com/ec-myyrylit',
      };

      const message = buildMatchAnnouncement(en, data);

      expect(message).toContain('[EC Myyrylit](https://example.com/ec-myyrylit)');
    });
  });

  describe('buildLineupAnnouncement', () => {
    test('builds lineup announcement', () => {
      const lineup: Player[] = [
        { telegramId: 1, displayName: 'Player 1', username: 'p1', createdAt: '' },
        { telegramId: 2, displayName: 'Player 2', username: null, createdAt: '' },
      ];

      const message = buildLineupAnnouncement(en, 5, '27.1. - 2.2.', lineup);

      expect(message).toContain('Lineup set (2 players)');
      expect(message).toContain('Week 5');
      // Player 1 has username 'p1' (no @ to avoid ping), Player 2 has no username
      expect(message).toContain('p1');
      expect(message).toContain('Player 2');
    });

    test('builds lineup announcement with single player', () => {
      const lineup: Player[] = [
        { telegramId: 1, displayName: 'Player 1', username: null, createdAt: '' },
      ];

      const message = buildLineupAnnouncement(en, 5, '27.1. - 2.2.', lineup);

      expect(message).toContain('Lineup set (1 players)');
      expect(message).toContain('Week 5');
      expect(message).toContain('Player 1');
    });
  });

  describe('buildMatchScheduledAnnouncement', () => {
    test('builds match scheduled announcement', () => {
      const message = buildMatchScheduledAnnouncement(en, 'Sunday', '20:00');

      expect(message).toContain('Match scheduled');
      expect(message).toContain('Sunday at 20:00');
    });
  });
});
