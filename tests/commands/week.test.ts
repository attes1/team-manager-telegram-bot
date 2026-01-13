import { createTestDb } from '@tests/helpers';
import type { Kysely } from 'kysely';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { registerWeekCommand } from '@/bot/commands/admin/week';
import { startSeason } from '@/services/season';
import type { DB } from '@/types/db';
import { createCommandUpdate, createTestBot } from './helpers';

const { mockDb, mockEnv } = vi.hoisted(() => ({
  mockDb: { db: null as unknown as Kysely<DB> },
  mockEnv: {
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
  },
}));

const TEST_ADMIN_ID = 123456;
const TEST_USER_ID = 999999;
const TEST_CHAT_ID = -100123;

vi.mock('@/db', () => mockDb);
vi.mock('@/env', () => mockEnv);

describe('/setweek command', () => {
  beforeEach(async () => {
    mockDb.db = await createTestDb();
  });

  afterEach(async () => {
    await mockDb.db.destroy();
  });

  test('admin can set week as practice', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek 5 practice', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('sendMessage');
    expect(calls[0].payload.text).toContain('Week 5');
    expect(calls[0].payload.text).toContain('practice');
  });

  test('admin can set week as match', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek 10 match', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Week 10');
    expect(calls[0].payload.text).toContain('match');
  });

  test('non-admin cannot set week', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek 5 practice', TEST_USER_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('permission');
  });

  test('requires active season', async () => {
    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek 5 practice', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('No active season');
  });

  test('shows usage when missing arguments', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Usage');
  });

  test('shows usage when missing type', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek 5', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Usage');
  });

  test('rejects invalid week number', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek 0 practice', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Invalid week');
  });

  test('rejects week number over 53', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek 54 practice', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Invalid week');
  });

  test('rejects invalid type', async () => {
    await startSeason(mockDb.db, 'Test Season');

    const { bot, calls } = createTestBot();
    registerWeekCommand(bot);

    const update = createCommandUpdate('/setweek 5 invalid', TEST_ADMIN_ID, TEST_CHAT_ID);
    await bot.handleUpdate(update);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload.text).toContain('Invalid type');
  });
});
