import type { Kysely } from 'kysely';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { endSeason, getActiveSeason, getSeasonById, startSeason } from '../../src/services/season';
import type { DB } from '../../src/types/db';
import { createTestDb } from '../helpers';

describe('season service', () => {
  let db: Kysely<DB>;

  beforeEach(async () => {
    db = await createTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  describe('startSeason', () => {
    test('creates a new season with active status', async () => {
      const season = await startSeason(db, 'Spring 2025');

      expect(season.name).toBe('Spring 2025');
      expect(season.status).toBe('active');
      expect(season.endedAt).toBeNull();
    });

    test('creates config for the new season', async () => {
      const season = await startSeason(db, 'Spring 2025');

      const config = await db
        .selectFrom('config')
        .selectAll()
        .where('season_id', '=', season.id)
        .executeTakeFirst();

      expect(config).toBeDefined();
      expect(config?.season_id).toBe(season.id);
    });

    test('ends any existing active season', async () => {
      const season1 = await startSeason(db, 'Season 1');
      const season2 = await startSeason(db, 'Season 2');

      const oldSeason = await getSeasonById(db, season1.id);
      expect(oldSeason?.status).toBe('ended');
      expect(oldSeason?.endedAt).not.toBeNull();

      expect(season2.status).toBe('active');
    });

    test('only one season can be active at a time', async () => {
      await startSeason(db, 'Season 1');
      await startSeason(db, 'Season 2');
      await startSeason(db, 'Season 3');

      const activeSeasons = await db
        .selectFrom('seasons')
        .selectAll()
        .where('status', '=', 'active')
        .execute();

      expect(activeSeasons).toHaveLength(1);
      expect(activeSeasons[0].name).toBe('Season 3');
    });
  });

  describe('endSeason', () => {
    test('ends the active season', async () => {
      const season = await startSeason(db, 'Test Season');
      const ended = await endSeason(db);

      expect(ended).toBe(true);

      const updatedSeason = await getSeasonById(db, season.id);
      expect(updatedSeason?.status).toBe('ended');
      expect(updatedSeason?.endedAt).not.toBeNull();
    });

    test('returns false if no active season', async () => {
      const ended = await endSeason(db);
      expect(ended).toBe(false);
    });

    test('returns false if season already ended', async () => {
      await startSeason(db, 'Test Season');
      await endSeason(db);

      const ended = await endSeason(db);
      expect(ended).toBe(false);
    });
  });

  describe('getActiveSeason', () => {
    test('returns undefined when no seasons exist', async () => {
      const season = await getActiveSeason(db);
      expect(season).toBeUndefined();
    });

    test('returns undefined when no active season', async () => {
      await startSeason(db, 'Test Season');
      await endSeason(db);

      const season = await getActiveSeason(db);
      expect(season).toBeUndefined();
    });

    test('returns the active season', async () => {
      await startSeason(db, 'Test Season');

      const season = await getActiveSeason(db);
      expect(season).toBeDefined();
      expect(season?.name).toBe('Test Season');
      expect(season?.status).toBe('active');
    });
  });

  describe('getSeasonById', () => {
    test('returns season by id', async () => {
      const created = await startSeason(db, 'Test Season');
      const found = await getSeasonById(db, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Test Season');
    });

    test('returns undefined for non-existent id', async () => {
      const found = await getSeasonById(db, 999);
      expect(found).toBeUndefined();
    });
  });
});
