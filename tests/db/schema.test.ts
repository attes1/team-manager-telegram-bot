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
    expect(result.created_at).toBeDefined();
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
    await db.insertInto('config').values({ season_id: 1 }).execute();

    const config = await db
      .selectFrom('config')
      .selectAll()
      .where('season_id', '=', 1)
      .executeTakeFirstOrThrow();

    expect(config.language).toBe('fi');
    expect(config.poll_day).toBe('sun');
    expect(config.poll_time).toBe('10:00');
    expect(config.reminders_mode).toBe('quiet');
    expect(config.lineup_size).toBe(5);
  });

  test('rejects invalid time format', async () => {
    await expect(
      db.insertInto('config').values({ season_id: 1, poll_time: 'invalid' }).execute(),
    ).rejects.toThrow();
  });

  test('rejects invalid reminders mode', async () => {
    await expect(
      db
        .insertInto('config')
        .values({ season_id: 1, reminders_mode: 'invalid' as 'ping' })
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
      .values({ telegram_id: 123456, display_name: 'Test Player', username: 'testuser' })
      .returningAll()
      .executeTakeFirstOrThrow();

    expect(result.telegram_id).toBe(123456);
    expect(result.display_name).toBe('Test Player');
    expect(result.username).toBe('testuser');
  });

  test('allows null username', async () => {
    const result = await db
      .insertInto('players')
      .values({ telegram_id: 123456, display_name: 'Test Player' })
      .returningAll()
      .executeTakeFirstOrThrow();

    expect(result.username).toBeNull();
  });
});

describe('day_responses', () => {
  let db: Kysely<DB>;

  beforeEach(async () => {
    db = await createTestDb();
    await db.insertInto('seasons').values({ name: 'Test Season' }).execute();
    await db.insertInto('players').values({ telegram_id: 123, display_name: 'Player 1' }).execute();
  });

  afterEach(async () => {
    await db.destroy();
  });

  test('creates day response', async () => {
    const result = await db
      .insertInto('day_responses')
      .values({
        season_id: 1,
        player_id: 123,
        week_number: 5,
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
        .insertInto('day_responses')
        .values({
          season_id: 1,
          player_id: 123,
          week_number: 5,
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
        .insertInto('day_responses')
        .values({
          season_id: 1,
          player_id: 123,
          week_number: 5,
          year: 2025,
          day: 'mon',
          status: 'invalid' as 'available',
        })
        .execute(),
    ).rejects.toThrow();
  });

  test('enforces unique constraint per player/week/day', async () => {
    await db
      .insertInto('day_responses')
      .values({
        season_id: 1,
        player_id: 123,
        week_number: 5,
        year: 2025,
        day: 'mon',
        status: 'available',
      })
      .execute();

    await expect(
      db
        .insertInto('day_responses')
        .values({
          season_id: 1,
          player_id: 123,
          week_number: 5,
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
    await db.insertInto('config').values({ season_id: 1 }).execute();

    await db.deleteFrom('seasons').where('id', '=', 1).execute();

    const configs = await db.selectFrom('config').selectAll().execute();
    expect(configs).toHaveLength(0);
  });

  test('deleting player cascades to day_responses', async () => {
    await db.insertInto('seasons').values({ name: 'Test' }).execute();
    await db.insertInto('players').values({ telegram_id: 123, display_name: 'Test' }).execute();
    await db
      .insertInto('day_responses')
      .values({
        season_id: 1,
        player_id: 123,
        week_number: 5,
        year: 2025,
        day: 'mon',
        status: 'available',
      })
      .execute();

    await db.deleteFrom('players').where('telegram_id', '=', 123).execute();

    const responses = await db.selectFrom('day_responses').selectAll().execute();
    expect(responses).toHaveLength(0);
  });
});
