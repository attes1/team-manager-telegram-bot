import type { Kysely } from 'kysely';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { getConfig, updateConfig } from '../../src/services/config';
import { startSeason } from '../../src/services/season';
import type { DB } from '../../src/types/db';
import { createTestDb } from '../helpers';

describe('config service', () => {
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

  describe('getConfig', () => {
    test('returns config for season', async () => {
      const config = await getConfig(db, seasonId);

      expect(config).toBeDefined();
      expect(config?.seasonId).toBe(seasonId);
      expect(config?.language).toBe('fi');
      expect(config?.pollDay).toBe('sun');
      expect(config?.pollTime).toBe('10:00');
      expect(config?.lineupSize).toBe(5);
    });

    test('returns undefined for non-existent season', async () => {
      const config = await getConfig(db, 999);
      expect(config).toBeUndefined();
    });

    test('returns all config fields', async () => {
      const config = await getConfig(db, seasonId);

      expect(config).toMatchObject({
        seasonId,
        language: 'fi',
        pollDay: 'sun',
        pollTime: '10:00',
        pollDays: 'mon,tue,wed,thu,fri,sat,sun',
        pollTimes: '19,20,21',
        reminderDay: 'wed',
        reminderTime: '18:00',
        remindersMode: 'quiet',
        matchDay: 'sun',
        matchTime: '20:00',
        lineupSize: 5,
      });
    });
  });

  describe('updateConfig', () => {
    test('updates language', async () => {
      const updated = await updateConfig(db, seasonId, 'language', 'en');
      expect(updated).toBe(true);

      const config = await getConfig(db, seasonId);
      expect(config?.language).toBe('en');
    });

    test('updates poll_day', async () => {
      const updated = await updateConfig(db, seasonId, 'poll_day', 'mon');
      expect(updated).toBe(true);

      const config = await getConfig(db, seasonId);
      expect(config?.pollDay).toBe('mon');
    });

    test('updates poll_time', async () => {
      const updated = await updateConfig(db, seasonId, 'poll_time', '09:00');
      expect(updated).toBe(true);

      const config = await getConfig(db, seasonId);
      expect(config?.pollTime).toBe('09:00');
    });

    test('updates poll_days', async () => {
      const updated = await updateConfig(db, seasonId, 'poll_days', 'mon,wed,fri');
      expect(updated).toBe(true);

      const config = await getConfig(db, seasonId);
      expect(config?.pollDays).toBe('mon,wed,fri');
    });

    test('updates poll_times', async () => {
      const updated = await updateConfig(db, seasonId, 'poll_times', '18,19,20,21');
      expect(updated).toBe(true);

      const config = await getConfig(db, seasonId);
      expect(config?.pollTimes).toBe('18,19,20,21');
    });

    test('updates reminder_day', async () => {
      const updated = await updateConfig(db, seasonId, 'reminder_day', 'thu');
      expect(updated).toBe(true);

      const config = await getConfig(db, seasonId);
      expect(config?.reminderDay).toBe('thu');
    });

    test('updates reminder_time', async () => {
      const updated = await updateConfig(db, seasonId, 'reminder_time', '17:00');
      expect(updated).toBe(true);

      const config = await getConfig(db, seasonId);
      expect(config?.reminderTime).toBe('17:00');
    });

    test('updates reminders_mode', async () => {
      const updated = await updateConfig(db, seasonId, 'reminders_mode', 'ping');
      expect(updated).toBe(true);

      const config = await getConfig(db, seasonId);
      expect(config?.remindersMode).toBe('ping');
    });

    test('updates match_day', async () => {
      const updated = await updateConfig(db, seasonId, 'match_day', 'sat');
      expect(updated).toBe(true);

      const config = await getConfig(db, seasonId);
      expect(config?.matchDay).toBe('sat');
    });

    test('updates match_time', async () => {
      const updated = await updateConfig(db, seasonId, 'match_time', '19:00');
      expect(updated).toBe(true);

      const config = await getConfig(db, seasonId);
      expect(config?.matchTime).toBe('19:00');
    });

    test('updates lineup_size', async () => {
      const updated = await updateConfig(db, seasonId, 'lineup_size', '7');
      expect(updated).toBe(true);

      const config = await getConfig(db, seasonId);
      expect(config?.lineupSize).toBe(7);
    });

    test('returns false for non-existent season', async () => {
      const updated = await updateConfig(db, 999, 'language', 'en');
      expect(updated).toBe(false);
    });

    test('throws for invalid config key', async () => {
      await expect(updateConfig(db, seasonId, 'invalid_key', 'value')).rejects.toThrow();
    });
  });
});
