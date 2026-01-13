import { createTestDb, testEnv } from '@tests/helpers';
import type { Kysely } from 'kysely';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getConfig, updateConfig } from '@/services/config';
import { startSeason } from '@/services/season';
import type { DB } from '@/types/db';

vi.mock('@/env', () => ({ env: testEnv }));

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
      expect(config?.language).toBe('en');
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
        language: 'en',
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

    test('updates pollDay', async () => {
      const updated = await updateConfig(db, seasonId, 'pollDay', 'mon');
      expect(updated).toBe(true);

      const config = await getConfig(db, seasonId);
      expect(config?.pollDay).toBe('mon');
    });

    test('updates pollTime', async () => {
      const updated = await updateConfig(db, seasonId, 'pollTime', '09:00');
      expect(updated).toBe(true);

      const config = await getConfig(db, seasonId);
      expect(config?.pollTime).toBe('09:00');
    });

    test('updates pollDays', async () => {
      const updated = await updateConfig(db, seasonId, 'pollDays', 'mon,wed,fri');
      expect(updated).toBe(true);

      const config = await getConfig(db, seasonId);
      expect(config?.pollDays).toBe('mon,wed,fri');
    });

    test('updates pollTimes', async () => {
      const updated = await updateConfig(db, seasonId, 'pollTimes', '18,19,20,21');
      expect(updated).toBe(true);

      const config = await getConfig(db, seasonId);
      expect(config?.pollTimes).toBe('18,19,20,21');
    });

    test('updates reminderDay', async () => {
      const updated = await updateConfig(db, seasonId, 'reminderDay', 'thu');
      expect(updated).toBe(true);

      const config = await getConfig(db, seasonId);
      expect(config?.reminderDay).toBe('thu');
    });

    test('updates reminderTime', async () => {
      const updated = await updateConfig(db, seasonId, 'reminderTime', '17:00');
      expect(updated).toBe(true);

      const config = await getConfig(db, seasonId);
      expect(config?.reminderTime).toBe('17:00');
    });

    test('updates remindersMode', async () => {
      const updated = await updateConfig(db, seasonId, 'remindersMode', 'ping');
      expect(updated).toBe(true);

      const config = await getConfig(db, seasonId);
      expect(config?.remindersMode).toBe('ping');
    });

    test('updates matchDay', async () => {
      const updated = await updateConfig(db, seasonId, 'matchDay', 'sat');
      expect(updated).toBe(true);

      const config = await getConfig(db, seasonId);
      expect(config?.matchDay).toBe('sat');
    });

    test('updates matchTime', async () => {
      const updated = await updateConfig(db, seasonId, 'matchTime', '19:00');
      expect(updated).toBe(true);

      const config = await getConfig(db, seasonId);
      expect(config?.matchTime).toBe('19:00');
    });

    test('updates lineupSize', async () => {
      const updated = await updateConfig(db, seasonId, 'lineupSize', '7');
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
