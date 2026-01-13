import Database from 'better-sqlite3';
import { CamelCasePlugin, Kysely, SqliteDialect } from 'kysely';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { registerConfigCommand } from '@/bot/commands/admin/config';
import { up } from '@/db/migrations/001_initial';
import { startSeason } from '@/services/season';
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
    DEFAULT_MATCH_DAY_REMINDER_ENABLED: true,
    DEFAULT_MATCH_DAY_REMINDER_TIME: '18:00',
  },
}));
const mockRefreshScheduler = vi.hoisted(() => vi.fn());

const TEST_ADMIN_ID = 123456;
const TEST_USER_ID = 999999;
const TEST_CHAT_ID = -100123;

vi.mock('@/db', () => mockDb);
vi.mock('@/env', () => mockEnv);
vi.mock('@/scheduler', () => ({ refreshScheduler: mockRefreshScheduler }));

describe('/config command', () => {
  beforeEach(async () => {
    const db = new Kysely<DB>({
      dialect: new SqliteDialect({
        database: new Database(':memory:'),
      }),
      plugins: [new CamelCasePlugin()],
    });
    await up(db);
    mockDb.db = db;
    mockRefreshScheduler.mockClear();
  });

  afterEach(async () => {
    await mockDb.db.destroy();
  });

  describe('show config', () => {
    test('admin can view config', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot, calls } = createTestBot();
      registerConfigCommand(bot);

      const update = createCommandUpdate('/config', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('sendMessage');
      expect(calls[0].payload.text).toContain('Settings');
      expect(calls[0].payload.text).toContain('Language');
      expect(calls[0].payload.text).toContain('Poll day');
    });

    test('non-admin cannot view config', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot, calls } = createTestBot();
      registerConfigCommand(bot);

      const update = createCommandUpdate('/config', TEST_USER_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('permission');
    });

    test('requires active season', async () => {
      const { bot, calls } = createTestBot();
      registerConfigCommand(bot);

      const update = createCommandUpdate('/config', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('No active season');
    });
  });

  describe('update config', () => {
    test('admin can update language', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot, calls } = createTestBot();
      registerConfigCommand(bot);

      const update = createCommandUpdate('/config language en', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(3);
      expect(calls[0].method).toBe('setMyCommands');
      expect(calls[1].method).toBe('setMyCommands');
      expect(calls[1].payload.scope).toEqual({ type: 'chat', chat_id: TEST_CHAT_ID });
      expect(calls[2].payload.text).toContain('language');
      expect(calls[2].payload.text).toContain('en');
    });

    test('admin can update poll_day', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot, calls } = createTestBot();
      registerConfigCommand(bot);

      const update = createCommandUpdate('/config poll_day mon', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('poll_day');
      expect(calls[0].payload.text).toContain('mon');
    });

    test('admin can update poll_time', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot, calls } = createTestBot();
      registerConfigCommand(bot);

      const update = createCommandUpdate('/config poll_time 09:00', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('poll_time');
      expect(calls[0].payload.text).toContain('09:00');
    });

    test('admin can update lineup_size', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot, calls } = createTestBot();
      registerConfigCommand(bot);

      const update = createCommandUpdate('/config lineup_size 7', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('lineup_size');
      expect(calls[0].payload.text).toContain('7');
    });

    test('rejects invalid config key', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot, calls } = createTestBot();
      registerConfigCommand(bot);

      const update = createCommandUpdate('/config invalid_key value', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('Unknown setting');
    });

    test('rejects invalid config value', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot, calls } = createTestBot();
      registerConfigCommand(bot);

      const update = createCommandUpdate('/config poll_time invalid', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('Invalid time format');
    });

    test('shows config when key provided without value', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot, calls } = createTestBot();
      registerConfigCommand(bot);

      const update = createCommandUpdate('/config language', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('Settings');
    });

    test('refreshes scheduler when updating poll_day', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot } = createTestBot();
      registerConfigCommand(bot);

      const update = createCommandUpdate('/config poll_day mon', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(mockRefreshScheduler).toHaveBeenCalledTimes(1);
    });

    test('refreshes scheduler when updating reminder_time', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot } = createTestBot();
      registerConfigCommand(bot);

      const update = createCommandUpdate(
        '/config reminder_time 19:00',
        TEST_ADMIN_ID,
        TEST_CHAT_ID,
      );
      await bot.handleUpdate(update);

      expect(mockRefreshScheduler).toHaveBeenCalledTimes(1);
    });

    test('refreshes scheduler when updating match_day_reminder_enabled', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot } = createTestBot();
      registerConfigCommand(bot);

      const update = createCommandUpdate(
        '/config match_day_reminder_enabled off',
        TEST_ADMIN_ID,
        TEST_CHAT_ID,
      );
      await bot.handleUpdate(update);

      expect(mockRefreshScheduler).toHaveBeenCalledTimes(1);
    });

    test('does not refresh scheduler when updating language', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot } = createTestBot();
      registerConfigCommand(bot);

      const update = createCommandUpdate('/config language fi', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(mockRefreshScheduler).not.toHaveBeenCalled();
    });

    test('does not refresh scheduler when updating lineup_size', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot } = createTestBot();
      registerConfigCommand(bot);

      const update = createCommandUpdate('/config lineup_size 6', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(mockRefreshScheduler).not.toHaveBeenCalled();
    });
  });
});
