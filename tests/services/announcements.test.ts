import { describe, expect, test } from 'vitest';
import { en } from '@/i18n/en';
import { fi } from '@/i18n/fi';
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
      };

      const message = buildMatchAnnouncement(en, data);

      expect(message).toContain('Week 5 (27.1. - 2.2.)');
      expect(message).toContain('Sunday at 20:00');
      expect(message).toContain('Player 1');
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
      };

      const message = buildMatchAnnouncement(en, data);

      expect(message).toContain('Time not yet scheduled');
    });

    test('builds Finnish announcement', () => {
      const data: MatchAnnouncementData = {
        week: 5,
        dateRange: '27.1. - 2.2.',
        matchDay: 'sunnuntai',
        matchTime: '20:00',
        isDefault: false,
        lineup: [{ telegramId: 1, displayName: 'Pelaaja', username: null, createdAt: '' }],
      };

      const message = buildMatchAnnouncement(fi, data);

      expect(message).toContain('Vko 5');
      expect(message).toContain('sunnuntai klo 20:00');
      expect(message).toContain('Kokoonpano');
      expect(message).toContain('Pelaaja');
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
      expect(message).toContain('Player 1');
      expect(message).toContain('Player 2');
    });

    test('builds Finnish lineup announcement', () => {
      const lineup: Player[] = [
        { telegramId: 1, displayName: 'Pelaaja 1', username: null, createdAt: '' },
      ];

      const message = buildLineupAnnouncement(fi, 5, '27.1. - 2.2.', lineup);

      expect(message).toContain('Kokoonpano asetettu (1 pelaajaa)');
      expect(message).toContain('Vko 5');
      expect(message).toContain('Pelaaja 1');
    });
  });

  describe('buildMatchScheduledAnnouncement', () => {
    test('builds match scheduled announcement', () => {
      const message = buildMatchScheduledAnnouncement(en, 'Sunday', '20:00');
      expect(message).toContain('Match scheduled');
      expect(message).toContain('Sunday at 20:00');
    });

    test('builds Finnish match scheduled announcement', () => {
      const message = buildMatchScheduledAnnouncement(fi, 'sunnuntai', '20:00');
      expect(message).toContain('Matsi sovittu');
      expect(message).toContain('sunnuntai klo 20:00');
    });
  });
});
