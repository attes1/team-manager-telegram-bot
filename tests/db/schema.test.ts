import { createTestDb } from '@tests/helpers';
import type { Kysely } from 'kysely';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import type { DB } from '@/types/db';

describe('seasons', () => {
  let db: Kysely<DB>;

  beforeEach(async () => {
    db = await createTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  test('creates season with default status', async () => {
    const result = await db
      .insertInto('seasons')
      .values({ name: 'Spring 2025' })
      .returningAll()
      .executeTakeFirstOrThrow();

    expect(result.status).toBe('active');
    expect(result.name).toBe('Spring 2025');
    expect(result.createdAt).toBeDefined();
  });

  test('rejects invalid status', async () => {
    await expect(
      db
        .insertInto('seasons')
        .values({ name: 'Test', status: 'invalid' as 'active' })
        .execute(),
    ).rejects.toThrow();
  });
});

describe('config', () => {
  let db: Kysely<DB>;

  beforeEach(async () => {
    db = await createTestDb();
    await db.insertInto('seasons').values({ name: 'Test Season' }).execute();
  });

  afterEach(async () => {
    await db.destroy();
  });

  test('creates config with defaults', async () => {
    await db.insertInto('config').values({ seasonId: 1 }).execute();

    const config = await db
      .selectFrom('config')
      .selectAll()
      .where('seasonId', '=', 1)
      .executeTakeFirstOrThrow();

    expect(config.language).toBe('fi');
    expect(config.pollDay).toBe('sun');
    expect(config.pollTime).toBe('10:00');
    expect(config.remindersMode).toBe('quiet');
    expect(config.lineupSize).toBe(5);
  });

  test('rejects invalid time format', async () => {
    await expect(
      db.insertInto('config').values({ seasonId: 1, pollTime: 'invalid' }).execute(),
    ).rejects.toThrow();
  });

  test('rejects invalid reminders mode', async () => {
    await expect(
      db
        .insertInto('config')
        .values({ seasonId: 1, remindersMode: 'invalid' as 'ping' })
        .execute(),
    ).rejects.toThrow();
  });
});

describe('players', () => {
  let db: Kysely<DB>;

  beforeEach(async () => {
    db = await createTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  test('creates player', async () => {
    const result = await db
      .insertInto('players')
      .values({ telegramId: 123456, displayName: 'Test Player', username: 'testuser' })
      .returningAll()
      .executeTakeFirstOrThrow();

    expect(result.telegramId).toBe(123456);
    expect(result.displayName).toBe('Test Player');
    expect(result.username).toBe('testuser');
  });

  test('allows null username', async () => {
    const result = await db
      .insertInto('players')
      .values({ telegramId: 123456, displayName: 'Test Player' })
      .returningAll()
      .executeTakeFirstOrThrow();

    expect(result.username).toBeNull();
  });
});

describe('dayResponses', () => {
  let db: Kysely<DB>;

  beforeEach(async () => {
    db = await createTestDb();
    await db.insertInto('seasons').values({ name: 'Test Season' }).execute();
    await db.insertInto('players').values({ telegramId: 123, displayName: 'Player 1' }).execute();
  });

  afterEach(async () => {
    await db.destroy();
  });

  test('creates day response', async () => {
    const result = await db
      .insertInto('dayResponses')
      .values({
        seasonId: 1,
        playerId: 123,
        weekNumber: 5,
        year: 2025,
        day: 'mon',
        status: 'available',
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    expect(result.day).toBe('mon');
    expect(result.status).toBe('available');
  });

  test('rejects invalid day', async () => {
    await expect(
      db
        .insertInto('dayResponses')
        .values({
          seasonId: 1,
          playerId: 123,
          weekNumber: 5,
          year: 2025,
          day: 'invalid' as 'mon',
          status: 'available',
        })
        .execute(),
    ).rejects.toThrow();
  });

  test('rejects invalid status', async () => {
    await expect(
      db
        .insertInto('dayResponses')
        .values({
          seasonId: 1,
          playerId: 123,
          weekNumber: 5,
          year: 2025,
          day: 'mon',
          status: 'invalid' as 'available',
        })
        .execute(),
    ).rejects.toThrow();
  });

  test('enforces unique constraint per player/week/day', async () => {
    await db
      .insertInto('dayResponses')
      .values({
        seasonId: 1,
        playerId: 123,
        weekNumber: 5,
        year: 2025,
        day: 'mon',
        status: 'available',
      })
      .execute();

    await expect(
      db
        .insertInto('dayResponses')
        .values({
          seasonId: 1,
          playerId: 123,
          weekNumber: 5,
          year: 2025,
          day: 'mon',
          status: 'unavailable',
        })
        .execute(),
    ).rejects.toThrow();
  });
});

describe('cascade deletes', () => {
  let db: Kysely<DB>;

  beforeEach(async () => {
    db = await createTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  test('deleting season cascades to config', async () => {
    await db.insertInto('seasons').values({ name: 'Test' }).execute();
    await db.insertInto('config').values({ seasonId: 1 }).execute();

    await db.deleteFrom('seasons').where('id', '=', 1).execute();

    const configs = await db.selectFrom('config').selectAll().execute();
    expect(configs).toHaveLength(0);
  });

  test('deleting player cascades to dayResponses', async () => {
    await db.insertInto('seasons').values({ name: 'Test' }).execute();
    await db.insertInto('players').values({ telegramId: 123, displayName: 'Test' }).execute();
    await db
      .insertInto('dayResponses')
      .values({
        seasonId: 1,
        playerId: 123,
        weekNumber: 5,
        year: 2025,
        day: 'mon',
        status: 'available',
      })
      .execute();

    await db.deleteFrom('players').where('telegramId', '=', 123).execute();

    const responses = await db.selectFrom('dayResponses').selectAll().execute();
    expect(responses).toHaveLength(0);
  });
});
