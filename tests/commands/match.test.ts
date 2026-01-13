import Database from 'better-sqlite3';
import { CamelCasePlugin, Kysely, SqliteDialect } from 'kysely';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { up } from '@/db/migrations/001_initial';
import type { DB } from '@/types/db';
import { createCommandUpdate, createTestBot } from './helpers';

const mockDb = vi.hoisted(() => ({ db: null as unknown as Kysely<DB> }));
const mockEnv = vi.hoisted(() => ({
  env: {
    ADMIN_IDS: [123456],
    DEFAULT_LANGUAGE: 'en',
  },
}));

const TEST_ADMIN_ID = 123456;
const TEST_USER_ID = 999999;
const TEST_CHAT_ID = -100123;

vi.mock('@/db', () => mockDb);
vi.mock('@/env', () => mockEnv);

const { registerMatchCommands } = await import('@/commands/admin/match');
const { startSeason } = await import('@/services/season');

describe('/setmatch command', () => {
  beforeEach(async () => {
    const db = new Kysely<DB>({
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

  test('admin can set match time', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createCommandUpdate('/setmatch sun 20:00', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('Match scheduled');
    expect(calls[0].payload.text).toContain('Sun');
    expect(calls[0].payload.text).toContain('20:00');
  });

  test('admin can set match on different day', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createCommandUpdate('/setmatch wed 19:00', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Wed');
    expect(calls[0].payload.text).toContain('19:00');
  });

  test('non-admin cannot set match', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createCommandUpdate('/setmatch sun 20:00', TEST_USER_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('permission');
  });

  test('requires active season', async () => {
    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createCommandUpdate('/setmatch sun 20:00', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('No active season');
  });

  test('shows usage when missing arguments', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createCommandUpdate('/setmatch', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Usage');
  });

  test('shows usage when missing time', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createCommandUpdate('/setmatch sun', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Usage');
  });

  test('rejects invalid day', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createCommandUpdate('/setmatch invalid 20:00', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Invalid day');
  });

  test('rejects invalid time format', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createCommandUpdate('/setmatch sun 2000', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Invalid time');
  });

  test('rejects time without colon', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerMatchCommands(bot);

    const update = createCommandUpdate('/setmatch sun 20', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Invalid time');
  });
});
