import { createTestDb } from '@tests/helpers';
import { mockDb, mockRefreshScheduler } from '@tests/setup';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { registerConfigCommand } from '@/bot/commands/admin/config';
import { startSeason } from '@/services/season';
import { createCommandUpdate, createTestBot } from './helpers';

const TEST_ADMIN_ID = 123456;
const TEST_USER_ID = 999999;
const TEST_CHAT_ID = -100123;

describe('/config command', () => {
  beforeEach(async () => {
    mockDb.db = await createTestDb();
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

    test('shows current value and options when key provided without value', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot, calls } = createTestBot();
      registerConfigCommand(bot);

      const update = createCommandUpdate('/config language', TEST_ADMIN_ID, TEST_CHAT_ID);
      await bot.handleUpdate(update);

      expect(calls).toHaveLength(1);
      expect(calls[0].payload.text).toContain('Language');
      expect(calls[0].payload.text).toContain('Current value');
      expect(calls[0].payload.text).toContain('fi, en');
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

    test('refreshes scheduler when updating match_day_reminder_mode', async () => {
      await startSeason(mockDb.db, 'Test Season');

      const { bot } = createTestBot();
      registerConfigCommand(bot);

      const update = createCommandUpdate(
        '/config match_day_reminder_mode off',
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
