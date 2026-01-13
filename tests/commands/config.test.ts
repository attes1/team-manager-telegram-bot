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

const { registerConfigCommand } = await import('@/commands/admin/config');
const { startSeason } = await import('@/services/season');

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

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('language');
      expect(calls[0].payload.text).toContain('en');
    });

    test('admin can update pollDay', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot, calls } = createTestBot();
      registerConfigCommand(bot);

      const update = createCommandUpdate('/config pollDay mon', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('pollDay');
      expect(calls[0].payload.text).toContain('mon');
    });

    test('admin can update pollTime', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot, calls } = createTestBot();
      registerConfigCommand(bot);

      const update = createCommandUpdate('/config pollTime 09:00', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('pollTime');
      expect(calls[0].payload.text).toContain('09:00');
    });

    test('admin can update lineupSize', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot, calls } = createTestBot();
      registerConfigCommand(bot);

      const update = createCommandUpdate('/config lineupSize 7', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('lineupSize');
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

      const update = createCommandUpdate('/config pollTime invalid', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('Invalid value');
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
  });
});
