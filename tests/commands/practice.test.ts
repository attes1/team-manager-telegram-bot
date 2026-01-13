import Database from 'better-sqlite3';
import { getISOWeek } from 'date-fns';
import type { Kysely } from 'kysely';
import { Kysely as KyselyClass, SqliteDialect } from 'kysely';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { up } from '@/db/migrations/001_initial';
import type { DB } from '@/types/db';
import { createCommandUpdate, createTestBot } from './helpers';

const mockDb = vi.hoisted(() => ({ db: null as unknown as Kysely<DB> }));
const mockEnv = vi.hoisted(() => ({
  env: { ADMIN_IDS: [123456], DEFAULT_LANGUAGE: 'en' as const },
}));

const ADMIN_ID = 123456;
const CHAT_ID = -100123456789;

vi.mock('@/db', () => mockDb);
vi.mock('@/env', () => mockEnv);

const { registerPracticeCommand } = await import('@/commands/player/practice');

describe('/practice command', () => {
  beforeEach(async () => {
    const db = new KyselyClass<DB>({
      dialect: new SqliteDialect({
        database: new Database(':memory:'),
      }),
    });
    await up(db);
    mockDb.db = db;
  });

  afterEach(async () => {
    await mockDb.db.destroy();
  });

  test('returns error when no active season', async () => {
    const { bot, calls } = createTestBot();
    registerPracticeCommand(bot);

    const update = createCommandUpdate('/practice', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('No active season');
  });

  test('shows no responses message when no availability data', async () => {
    const { bot, calls } = createTestBot();
    registerPracticeCommand(bot);

    await mockDb.db.insertInto('seasons').values({ name: 'Test Season' }).execute();

    const update = createCommandUpdate('/practice', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('No responses');
  });

  test('shows availability grid with players', async () => {
    const { bot, calls } = createTestBot();
    registerPracticeCommand(bot);

    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db.insertInto('config').values({ season_id: season.id }).execute();

    await mockDb.db
      .insertInto('players')
      .values({ telegram_id: 111, display_name: 'Player One', username: 'playerone' })
      .execute();

    await mockDb.db
      .insertInto('season_roster')
      .values({ season_id: season.id, player_id: 111 })
      .execute();

    const dayResponse = await mockDb.db
      .insertInto('day_responses')
      .values({
        season_id: season.id,
        player_id: 111,
        week_number: getISOWeek(new Date()),
        year: new Date().getFullYear(),
        day: 'mon',
        status: 'available',
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db
      .insertInto('time_slots')
      .values([
        { day_response_id: dayResponse.id, time_slot: '19' },
        { day_response_id: dayResponse.id, time_slot: '20' },
      ])
      .execute();

    const update = createCommandUpdate('/practice', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('Player One');
  });

  test('shows availability for specific day', async () => {
    const { bot, calls } = createTestBot();
    registerPracticeCommand(bot);

    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db.insertInto('config').values({ season_id: season.id }).execute();

    const update = createCommandUpdate('/practice mon', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
  });

  test('returns error for invalid day', async () => {
    const { bot, calls } = createTestBot();
    registerPracticeCommand(bot);

    await mockDb.db.insertInto('seasons').values({ name: 'Test Season' }).execute();

    const update = createCommandUpdate('/practice invalid', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('Invalid day');
  });
});
