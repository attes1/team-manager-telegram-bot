import Database from 'better-sqlite3';
import { getISOWeek } from 'date-fns';
import type { Kysely } from 'kysely';
import { CamelCasePlugin, Kysely as KyselyClass, SqliteDialect } from 'kysely';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { registerPracticeCommand } from '@/bot/commands/player/practice';
import { up } from '@/db/migrations/001_initial';
import type { DB } from '@/types/db';
import { createCommandUpdate, createTestBot } from './helpers';

const mockDb = vi.hoisted(() => ({ db: null as unknown as Kysely<DB> }));
const mockEnv = vi.hoisted(() => ({
  env: {
    ADMIN_IDS: [123456],
    DEFAULT_LANGUAGE: 'en' as const,
    DEFAULT_POLL_DAY: 'sun',
    DEFAULT_POLL_TIME: '10:00',
    DEFAULT_POLL_DAYS: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    DEFAULT_POLL_TIMES: [19, 20, 21],
    DEFAULT_REMINDER_DAY: 'wed',
    DEFAULT_REMINDER_TIME: '18:00',
    DEFAULT_REMINDERS_MODE: 'quiet' as const,
    DEFAULT_MATCH_DAY: 'sun',
    DEFAULT_MATCH_TIME: '20:00',
    DEFAULT_LINEUP_SIZE: 5,
  },
}));

const ADMIN_ID = 123456;
const CHAT_ID = -100123456789;

vi.mock('@/db', () => mockDb);
vi.mock('@/env', () => mockEnv);

describe('/practice command', () => {
  beforeEach(async () => {
    const db = new KyselyClass<DB>({
      dialect: new SqliteDialect({
        database: new Database(':memory:'),
      }),
      plugins: [new CamelCasePlugin()],
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

    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db.insertInto('config').values({ seasonId: season.id, language: 'en' }).execute();

    await mockDb.db
      .insertInto('players')
      .values({ telegramId: ADMIN_ID, displayName: 'Admin', username: 'admin' })
      .execute();

    await mockDb.db
      .insertInto('seasonRoster')
      .values({ seasonId: season.id, playerId: ADMIN_ID })
      .execute();

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

    await mockDb.db.insertInto('config').values({ seasonId: season.id }).execute();

    await mockDb.db
      .insertInto('players')
      .values([
        { telegramId: ADMIN_ID, displayName: 'Admin', username: 'admin' },
        { telegramId: 111, displayName: 'Player One', username: 'playerone' },
      ])
      .execute();

    await mockDb.db
      .insertInto('seasonRoster')
      .values([
        { seasonId: season.id, playerId: ADMIN_ID },
        { seasonId: season.id, playerId: 111 },
      ])
      .execute();

    const dayResponse = await mockDb.db
      .insertInto('dayResponses')
      .values({
        seasonId: season.id,
        playerId: 111,
        weekNumber: getISOWeek(new Date()),
        year: new Date().getFullYear(),
        day: 'mon',
        status: 'available',
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db
      .insertInto('timeSlots')
      .values([
        { dayResponseId: dayResponse.id, timeSlot: '19' },
        { dayResponseId: dayResponse.id, timeSlot: '20' },
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

    await mockDb.db.insertInto('config').values({ seasonId: season.id }).execute();

    await mockDb.db
      .insertInto('players')
      .values({ telegramId: ADMIN_ID, displayName: 'Admin', username: 'admin' })
      .execute();

    await mockDb.db
      .insertInto('seasonRoster')
      .values({ seasonId: season.id, playerId: ADMIN_ID })
      .execute();

    const update = createCommandUpdate('/practice mon', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
  });

  test('returns error for invalid day', async () => {
    const { bot, calls } = createTestBot();
    registerPracticeCommand(bot);

    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db.insertInto('config').values({ seasonId: season.id, language: 'en' }).execute();

    await mockDb.db
      .insertInto('players')
      .values({ telegramId: ADMIN_ID, displayName: 'Admin', username: 'admin' })
      .execute();

    await mockDb.db
      .insertInto('seasonRoster')
      .values({ seasonId: season.id, playerId: ADMIN_ID })
      .execute();

    const update = createCommandUpdate('/practice invalid', ADMIN_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('Invalid day');
  });
});
