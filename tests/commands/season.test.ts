import Database from 'better-sqlite3';
import { CamelCasePlugin, Kysely, SqliteDialect } from 'kysely';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { registerSeasonCommands } from '@/bot/commands/admin/season';
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

describe('season commands', () => {
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

  describe('/startseason', () => {
    test('admin can start a season', async () => {
      const { bot, calls } = createTestBot();
      registerSeasonCommands(bot);

      const update = createCommandUpdate('/startseason Spring 2025', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('sendMessage');
      expect(calls[0].payload.text).toContain('Spring 2025');
    });

    test('non-admin cannot start a season', async () => {
      const { bot, calls } = createTestBot();
      registerSeasonCommands(bot);

      const update = createCommandUpdate('/startseason Test', TEST_USER_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('sendMessage');
      expect(calls[0].payload.text).toContain('permission');
    });

    test('requires season name', async () => {
      const { bot, calls } = createTestBot();
      registerSeasonCommands(bot);

      const update = createCommandUpdate('/startseason', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('sendMessage');
      expect(calls[0].payload.text).toContain('name');
    });
  });

  describe('/endseason', () => {
    test('admin can end an active season', async () => {
      const { bot, calls } = createTestBot();
      registerSeasonCommands(bot);

      // First start a season
      const startUpdate = createCommandUpdate('/startseason Test', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(startUpdate);

      calls.length = 0; // Clear previous calls

      // Then end it
      const endUpdate = createCommandUpdate('/endseason', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(endUpdate);

      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('sendMessage');
      expect(calls[0].payload.text).toContain('Test');
      expect(calls[0].payload.text).toContain('ended');
    });

    test('non-admin cannot end a season', async () => {
      const { bot, calls } = createTestBot();
      registerSeasonCommands(bot);

      const update = createCommandUpdate('/endseason', TEST_USER_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('permission');
    });

    test('returns error when no active season', async () => {
      const { bot, calls } = createTestBot();
      registerSeasonCommands(bot);

      const update = createCommandUpdate('/endseason', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('No active season');
    });
  });

  describe('/season (info)', () => {
    test('shows season info when active', async () => {
      const { bot, calls } = createTestBot();
      registerSeasonCommands(bot);

      // Start a season first
      const startUpdate = createCommandUpdate(
        '/startseason Test Season',
        TEST_ADMIN_ID,
        TEST_CHAT_ID,
      );
      await bot.handleUpdate(startUpdate);

      calls.length = 0;

      // Get info
      const infoUpdate = createCommandUpdate('/season', TEST_USER_ID, TEST_CHAT_ID);
      await bot.handleUpdate(infoUpdate);

      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('sendMessage');
      expect(calls[0].payload.text).toContain('Test Season');
      expect(calls[0].payload.text).toContain('Active');
    });

    test('returns error when no active season', async () => {
      const { bot, calls } = createTestBot();
      registerSeasonCommands(bot);

      const update = createCommandUpdate('/season', TEST_USER_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('No active season');
    });
  });
});
