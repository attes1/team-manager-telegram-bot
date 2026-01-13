import Database from 'better-sqlite3';
import type { Kysely } from 'kysely';
import { CamelCasePlugin, Kysely as KyselyClass, SqliteDialect } from 'kysely';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { registerPollCommand } from '@/bot/commands/admin/poll';
import { up as up001 } from '@/db/migrations/001_initial';
import { up as up002 } from '@/db/migrations/002_roster_roles';
import { up as up003 } from '@/db/migrations/003_match_day_reminder_mode';
import { up as up004 } from '@/db/migrations/004_poll_cutoff';
import type { DB } from '@/types/db';
import { createCommandUpdate, createTestBot, type MockDb } from './helpers';

const mockDb = vi.hoisted<MockDb>(() => ({ db: null as unknown as Kysely<DB> }));
const mockEnv = vi.hoisted(() => ({
  env: {
    ADMIN_IDS: [123456],
    DEFAULT_LANGUAGE: 'en' as const,
    DEFAULT_POLL_DAY: 'sun',
    DEFAULT_POLL_TIME: '10:00',
    DEFAULT_POLL_DAYS: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    DEFAULT_POLL_TIMES: [19, 20, 21],
    DEFAULT_POLL_REMINDER_DAY: 'wed',
    DEFAULT_POLL_REMINDER_TIME: '18:00',
    DEFAULT_POLL_REMINDER_MODE: 'quiet' as const,
    DEFAULT_MATCH_DAY: 'sun',
    DEFAULT_MATCH_TIME: '20:00',
    DEFAULT_LINEUP_SIZE: 5,
    DEFAULT_MATCH_DAY_REMINDER_MODE: 'quiet' as const,
    DEFAULT_MATCH_DAY_REMINDER_TIME: '18:00',
  },
}));

const PLAYER_ID = 111;
const CHAT_ID = -100123456789;

vi.mock('@/db', () => mockDb);
vi.mock('@/env', () => mockEnv);

describe('/poll command', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    // Set to Wednesday of week 2, 2025 - before Thursday cutoff
    vi.setSystemTime(new Date('2025-01-08T09:00:00'));

    const db = new KyselyClass<DB>({
      dialect: new SqliteDialect({
        database: new Database(':memory:'),
      }),
      plugins: [new CamelCasePlugin()],
    });
    await up001(db);
    await up002(db);
    await up003(db);
    await up004(db);
    mockDb.db = db;
  });

  afterEach(async () => {
    vi.useRealTimers();
    await mockDb.db.destroy();
  });

  const setupSeasonWithPlayer = async () => {
    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    await mockDb.db.insertInto('config').values({ seasonId: season.id, language: 'en' }).execute();

    await mockDb.db
      .insertInto('players')
      .values({ telegramId: PLAYER_ID, displayName: 'Player', username: 'player' })
      .execute();

    await mockDb.db
      .insertInto('seasonRoster')
      .values({ seasonId: season.id, playerId: PLAYER_ID, role: 'player' })
      .execute();

    return season;
  };

  test('sends poll for target week when no parameter provided', async () => {
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    // Week 2 is target (before Thursday cutoff)
    expect(calls[0].payload.text).toContain('Week 2');
    expect(calls[0].payload.text).toContain('[w:2/2025]');
  });

  test('sends poll for specified week when parameter provided', async () => {
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll 5', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('Week 5');
    expect(calls[0].payload.text).toContain('[w:5/2025]');
  });

  test('includes week marker for menu parsing', async () => {
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll 10', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toMatch(/\[w:\d+\/\d+\]$/);
  });

  test('week 1 when on week 2 infers next year (not past)', async () => {
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    // Target week is 2/2025, week 1 infers to week 1/2026 (next year)
    const update = createCommandUpdate('/poll 1', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('Week 1');
    expect(calls[0].payload.text).toContain('[w:1/2026]');
  });

  test('accepts current target week', async () => {
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    // Target week is 2, so week 2 should be allowed
    const update = createCommandUpdate('/poll 2', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('Week 2');
    expect(calls[0].payload.text).not.toContain('past');
  });

  test('infers next year when week < target week', async () => {
    // Set to week 51 of 2025
    vi.setSystemTime(new Date('2025-12-18T11:00:00'));
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    // Request week 2, should infer 2026
    const update = createCommandUpdate('/poll 2', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('Week 2');
    expect(calls[0].payload.text).toContain('[w:2/2026]');
  });

  test('uses current year when week >= target week', async () => {
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    // Target week is 2, request week 10
    const update = createCommandUpdate('/poll 10', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('[w:10/2025]');
  });

  test('rejects invalid week number - too low', async () => {
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll 0', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toMatch(/invalid/i);
  });

  test('rejects invalid week number - too high', async () => {
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll 54', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toMatch(/invalid/i);
  });

  test('rejects non-numeric week parameter', async () => {
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll abc', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toMatch(/invalid/i);
  });

  test('targets next week when after cutoff', async () => {
    // Set to Friday of week 2 (after Thursday cutoff)
    vi.setSystemTime(new Date('2025-01-10T11:00:00'));
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Week 3');
    expect(calls[0].payload.text).toContain('[w:3/2025]');
  });

  test('week 2 when target is week 3 infers next year', async () => {
    // Set to Friday of week 2 (after Thursday cutoff, target is week 3)
    vi.setSystemTime(new Date('2025-01-10T11:00:00'));
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    // Target is week 3/2025, week 2 infers to week 2/2026 (next year)
    const update = createCommandUpdate('/poll 2', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Week 2');
    expect(calls[0].payload.text).toContain('[w:2/2026]');
  });

  test('returns error when no active season', async () => {
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('No active season');
  });

  test('returns error when user not in roster', async () => {
    await mockDb.db.insertInto('seasons').values({ name: 'Test Season' }).execute();
    const season = await mockDb.db.selectFrom('seasons').selectAll().executeTakeFirstOrThrow();
    await mockDb.db.insertInto('config').values({ seasonId: season.id }).execute();

    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll', 999, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('roster');
  });

  test('handles custom cutoff day configuration', async () => {
    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Set cutoff to Monday instead of Thursday
    await mockDb.db
      .insertInto('config')
      .values({
        seasonId: season.id,
        language: 'en',
        pollCutoffDay: 'mon',
        pollCutoffTime: '10:00',
      })
      .execute();

    await mockDb.db
      .insertInto('players')
      .values({ telegramId: PLAYER_ID, displayName: 'Player', username: 'player' })
      .execute();

    await mockDb.db
      .insertInto('seasonRoster')
      .values({ seasonId: season.id, playerId: PLAYER_ID, role: 'player' })
      .execute();

    // Set to Tuesday of week 2 (after Monday cutoff, so target is week 3)
    vi.setSystemTime(new Date('2025-01-07T11:00:00'));

    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Week 3');
  });

  test('handles custom cutoff time configuration', async () => {
    const season = await mockDb.db
      .insertInto('seasons')
      .values({ name: 'Test Season' })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Set cutoff to Thursday 08:00 instead of 10:00
    await mockDb.db
      .insertInto('config')
      .values({
        seasonId: season.id,
        language: 'en',
        pollCutoffDay: 'thu',
        pollCutoffTime: '08:00',
      })
      .execute();

    await mockDb.db
      .insertInto('players')
      .values({ telegramId: PLAYER_ID, displayName: 'Player', username: 'player' })
      .execute();

    await mockDb.db
      .insertInto('seasonRoster')
      .values({ seasonId: season.id, playerId: PLAYER_ID, role: 'player' })
      .execute();

    // Set to Thursday 09:00 (after 08:00 cutoff, so target is week 3)
    vi.setSystemTime(new Date('2025-01-09T09:00:00'));

    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Week 3');
  });

  test('year boundary - week 52 to week 1 of next year', async () => {
    // Set to Friday of week 52, 2025 (after Thursday cutoff)
    vi.setSystemTime(new Date('2025-12-26T11:00:00'));
    await setupSeasonWithPlayer();
    const { bot, calls } = createTestBot();
    registerPollCommand(bot);

    const update = createCommandUpdate('/poll', PLAYER_ID, CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Week 1');
    expect(calls[0].payload.text).toContain('[w:1/2026]');
  });
});
